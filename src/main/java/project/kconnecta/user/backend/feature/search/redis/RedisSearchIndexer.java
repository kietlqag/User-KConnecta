package project.kconnecta.user.backend.feature.search.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import redis.clients.jedis.JedisPooled;
import redis.clients.jedis.exceptions.JedisDataException;
import redis.clients.jedis.search.Document;
import redis.clients.jedis.search.FTCreateParams;
import redis.clients.jedis.search.IndexDataType;
import redis.clients.jedis.search.Query;
import redis.clients.jedis.search.schemafields.NumericField;
import redis.clients.jedis.search.schemafields.SchemaField;
import redis.clients.jedis.search.schemafields.TagField;
import redis.clients.jedis.search.schemafields.TextField;

import java.text.Normalizer;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service quản lý Index dữ liệu và thực hiện tìm kiếm toàn văn (Full-text Search) bằng RediSearch.
 * Công cụ tìm kiếm hiệu năng cao tích hợp sẵn trên Redis Stack giúp truy vấn nhanh chóng các thực thể:
 * Người dùng (User), Nhóm (Group), và Bài viết công khai (Post).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RedisSearchIndexer {

    // Định nghĩa tên Index trong RediSearch
    public static final String USER_IDX   = "user-idx";
    public static final String GROUP_IDX  = "group-idx";
    public static final String POST_IDX   = "post-idx";

    // Định nghĩa tiền tố (Prefix) của Key lưu trong Redis Hash
    public static final String USER_PFX   = "user:";
    public static final String GROUP_PFX  = "group:";
    public static final String POST_PFX   = "post:";

    private static final int REINDEX_BATCH_SIZE = 500;

    private final JedisPooled jedis;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final PostRepository postRepository;

    @Value("${app.search.reindex-on-startup:true}")
    private boolean reindexOnStartup;

    // ── Startup - Khởi động Index tự động ──────────────────────────────────────────────────────────

    /**
     * Lắng nghe sự kiện ApplicationReadyEvent để tạo Index và cập nhật cơ sở dữ liệu tìm kiếm
     * khi ứng dụng khởi động thành công.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            createIndexes(); // Tạo Index nếu chưa tồn tại
            if (!reindexOnStartup) {
                log.info("[RedisSearch] Skipping startup reindex (app.search.reindex-on-startup=false)");
                return;
            }
            // Khởi chạy tiến trình ngầm (Daemon Thread) thực hiện đánh chỉ mục toàn bộ dữ liệu (Reindex)
            // Việc chạy dưới nền giúp tránh block luồng khởi động chính của ứng dụng
            Thread reindexThread = new Thread(() -> {
                try {
                    reindexAllWithRetry(3, 3_000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("[RedisSearch] Startup reindex interrupted");
                } catch (Exception e) {
                    log.error("[RedisSearch] Background reindex failed: {}", e.getMessage());
                }
            }, "redis-search-reindex");
            reindexThread.setDaemon(true);
            reindexThread.start();
            log.info("[RedisSearch] Startup reindex scheduled in background");
        } catch (Exception e) {
            log.error("[RedisSearch] Startup indexing failed — search will fall back gracefully: {}", e.getMessage());
        }
    }

    /**
     * Cơ chế Reindex tự động thử lại nhiều lần nếu gặp lỗi kết nối cơ sở dữ liệu tạm thời.
     */
    private void reindexAllWithRetry(int maxAttempts, long delayMs) throws InterruptedException {
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                reindexAll();
                return;
            } catch (Exception e) {
                if (attempt >= maxAttempts || !isTransientDbError(e)) {
                    throw e;
                }
                log.warn("[RedisSearch] Reindex attempt {}/{} failed ({}), retrying in {}ms",
                        attempt, maxAttempts, rootMessage(e), delayMs);
                Thread.sleep(delayMs);
            }
        }
    }

    private static boolean isTransientDbError(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof java.net.SocketException) {
                return true;
            }
            String message = current.getMessage();
            if (message != null) {
                String lower = message.toLowerCase();
                if (lower.contains("i/o error")
                        || lower.contains("socket closed")
                        || lower.contains("connection reset")
                        || lower.contains("08006")
                        || lower.contains("connection refused")
                        || lower.contains("terminating connection")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    private static String rootMessage(Throwable error) {
        Throwable current = error;
        String message = error.getMessage();
        while (current.getCause() != null) {
            current = current.getCause();
            if (current.getMessage() != null) {
                message = current.getMessage();
            }
        }
        return message != null ? message : error.getClass().getSimpleName();
    }

    // ── Index Creation - Khởi tạo các Index ────────────────────────────────────────────────────────

    /**
     * Tạo tất cả Index cần thiết trong RediSearch.
     */
    public void createIndexes() {
        createUserIndex();
        createGroupIndex();
        createPostIndex();
        log.info("[RedisSearch] Indexes ready");
    }

    /**
     * Tạo Index Người dùng (User). Trọng số tìm kiếm ưu tiên theo Họ tên (weight 5.0) rồi tới Username (weight 2.0).
     */
    private void createUserIndex() {
        try {
            jedis.ftCreate(USER_IDX,
                FTCreateParams.createParams().on(IndexDataType.HASH).prefix(USER_PFX),
                new SchemaField[]{
                    TextField.of("s_name").weight(5.0),       // Tên hiển thị (được chuẩn hóa)
                    TextField.of("s_username").weight(2.0),   // Tên tài khoản (được chuẩn hóa)
                    TextField.of("s_bio").weight(1.0)         // Tiểu sử (được chuẩn hóa)
                }
            );
        } catch (JedisDataException e) {
            if (!e.getMessage().contains("already exists")) {
                log.warn("[RedisSearch] createUserIndex: {}", e.getMessage());
            }
        }
    }

    /**
     * Tạo Index Nhóm (Group). Cho phép lọc nhanh theo Quyền riêng tư (Privacy) dạng TagField.
     */
    private void createGroupIndex() {
        try {
            jedis.ftCreate(GROUP_IDX,
                    FTCreateParams.createParams().on(IndexDataType.HASH).prefix(GROUP_PFX),
                new SchemaField[]{
                    TextField.of("s_name").weight(5.0),       // Tên nhóm
                    TextField.of("s_description").weight(1.0),// Mô tả nhóm
                    TagField.of("privacy")                     // Quyền riêng tư (public/private)
                }
            );
        } catch (JedisDataException e) {
            if (!e.getMessage().contains("already exists")) {
                log.warn("[RedisSearch] createGroupIndex: {}", e.getMessage());
            }
        }
    }

    /**
     * Tạo Index Bài đăng (Post). Hỗ trợ lọc theo Tag (privacy, status) và sắp xếp theo Thời gian (publishedAt).
     */
    private void createPostIndex() {
        try {
            jedis.ftCreate(POST_IDX,
                    FTCreateParams.createParams().on(IndexDataType.HASH).prefix(POST_PFX),
                new SchemaField[]{
                    TextField.of("s_content"),               // Nội dung bài đăng
                    TagField.of("privacy"),                  // Quyền riêng tư
                    TagField.of("status"),                   // Trạng thái bài đăng
                    NumericField.of("publishedAt").sortable()// Thời điểm xuất bản (sắp xếp được)
                }
            );
        } catch (JedisDataException e) {
            if (!e.getMessage().contains("already exists")) {
                log.warn("[RedisSearch] createPostIndex: {}", e.getMessage());
            }
        }
    }

    // ── Full Reindex - Đánh chỉ mục toàn bộ dữ liệu ──────────────────────────────────────────────────────────

    /**
     * Đọc toàn bộ dữ liệu từ RDBMS và nạp lại vào Redis để xây dựng lại Index tìm kiếm.
     */
    public void reindexAll() {
        long start = System.currentTimeMillis();

        // 1. Reindex toàn bộ Users
        List<UserRepository.UserSearchProjection> users = userRepository.findAllSearchProjections();
        users.forEach(this::indexUser);

        // 2. Reindex toàn bộ Groups theo phân trang để tránh tràn bộ nhớ (Batching)
        long groupCount = reindexGroupsInBatches();

        // 3. Reindex toàn bộ Posts công khai đã xuất bản
        List<Post> posts = postRepository.findAllPublishedPublicWithAuthorAndGroup();
        posts.forEach(this::indexPost);

        log.info("[RedisSearch] Reindexed {} users, {} groups, {} posts in {}ms",
                users.size(), groupCount, posts.size(),
                System.currentTimeMillis() - start);
    }

    private long reindexGroupsInBatches() {
        long count = 0;
        Pageable pageable = Pageable.ofSize(REINDEX_BATCH_SIZE);
        Slice<GroupRepository.GroupSearchProjection> batch;
        do {
            batch = groupRepository.findSearchProjections(pageable);
            batch.forEach(this::indexGroup);
            count += batch.getNumberOfElements();
            pageable = batch.nextPageable();
        } while (batch.hasNext());
        return count;
    }

    // ── Index Single Document - Đánh chỉ mục thực thể đơn lẻ ───────────────────────────────────────────

    public void indexUser(User user) {
        indexUser(
                user.getId(),
                user.getFullName(),
                user.getUsername(),
                user.getAvatarUrl(),
                user.getBio()
        );
    }

    public void indexUser(UserRepository.UserSearchProjection user) {
        indexUser(
                user.getId(),
                user.getFullName(),
                user.getUsername(),
                user.getAvatarUrl(),
                user.getBio()
        );
    }

    /**
     * Đưa thông tin Người dùng vào Redis Hash.
     * Lưu trữ cả dạng hiển thị (fullName, username) và dạng đã chuẩn hóa viết thường không dấu (s_name, s_username).
     */
    private void indexUser(UUID userId, String fullName, String username, String avatarUrl, String bio) {
        try {
            Map<String, String> h = new HashMap<>();
            h.put("fullName",  safe(fullName));
            h.put("username",  safe(username));
            h.put("avatarUrl", safe(avatarUrl));
            h.put("bio",       safe(bio));
            // Các trường có tiền tố s_ dùng làm mục tiêu cho bộ lọc tìm kiếm toàn văn
            h.put("s_name",     normalize(fullName));
            h.put("s_username", normalize(username));
            h.put("s_bio",      normalize(bio));
            jedis.hset(USER_PFX + userId, h);
        } catch (Exception e) {
            log.debug("[RedisSearch] indexUser {} failed: {}", userId, e.getMessage());
        }
    }

    public void indexGroup(Group group) {
        indexGroup(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getCoverPhotoUrl(),
                group.getPrivacy()
        );
    }

    public void indexGroup(GroupRepository.GroupSearchProjection group) {
        indexGroup(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getCoverPhotoUrl(),
                group.getPrivacy()
        );
    }

    /**
     * Đưa thông tin Nhóm vào Redis Hash.
     */
    private void indexGroup(
            UUID groupId,
            String name,
            String description,
            String coverPhotoUrl,
            GroupPrivacy privacy) {
        try {
            Map<String, String> h = new HashMap<>();
            h.put("name",          safe(name));
            h.put("coverPhotoUrl", safe(coverPhotoUrl));
            h.put("privacy",       privacy.name().toLowerCase());
            h.put("s_name",        normalize(name));
            h.put("s_description", normalize(description));
            jedis.hset(GROUP_PFX + groupId, h);
        } catch (Exception e) {
            log.debug("[RedisSearch] indexGroup {} failed: {}", groupId, e.getMessage());
        }
    }

    /**
     * Đưa thông tin Bài viết vào Redis Hash.
     * BẢO MẬT: Bài đăng thuộc nhóm kín (PRIVATE) hoặc chưa xuất bản/không công khai sẽ bị loại bỏ khỏi index.
     */
    public void indexPost(Post post) {
        try {
            boolean inPrivateGroup = post.getGroup() != null
                    && post.getGroup().getPrivacy() == GroupPrivacy.PRIVATE;
            // Nếu bài đăng không phải PUBLIC, hoặc không phải PUBLISHED, hoặc thuộc Nhóm Kín -> Không cho phép tìm kiếm toàn cục
            if (post.getStatus() != PostStatus.PUBLISHED || post.getPrivacy() != PostPrivacy.PUBLIC || inPrivateGroup) {
                deletePost(post.getId()); // Xóa khỏi Index tìm kiếm nếu có
                return;
            }
            long ts = post.getPublishedAt() != null
                    ? post.getPublishedAt().toEpochSecond(ZoneOffset.UTC)
                    : post.getCreatedAt().toEpochSecond(ZoneOffset.UTC);

            String authorName = post.getAuthor() != null ? safe(post.getAuthor().getFullName()) : "";
            String authorAvatar = post.getAuthor() != null ? safe(post.getAuthor().getAvatarUrl()) : "";
            String groupId = post.getGroup() != null ? post.getGroup().getId().toString() : "";
            String groupName = post.getGroup() != null ? safe(post.getGroup().getName()) : "";
            String groupCover = post.getGroup() != null ? safe(post.getGroup().getCoverPhotoUrl()) : "";

            Map<String, String> h = new HashMap<>();
            h.put("content",     safe(post.getContent()));
            h.put("privacy",     post.getPrivacy().name().toLowerCase());
            h.put("status",      post.getStatus().name().toLowerCase());
            h.put("authorId",    post.getAuthor() != null ? post.getAuthor().getId().toString() : "");
            h.put("authorName",  authorName);
            h.put("authorAvatar", authorAvatar);
            h.put("groupId",     groupId);
            h.put("groupName",   groupName);
            h.put("groupCover",  groupCover);
            h.put("imageUrl",    safe(post.getImageUrl()));
            h.put("publishedAt", String.valueOf(ts));
            h.put("s_content",   normalize(post.getContent()));
            jedis.hset(POST_PFX + post.getId(), h);
        } catch (Exception e) {
            log.debug("[RedisSearch] indexPost {} failed: {}", post.getId(), e.getMessage());
        }
    }

    // ── Delete Document - Xóa khỏi Index ──────────────────────────────────────────────────────────

    public void deleteUser(UUID id)  { jedis.del(USER_PFX  + id); }
    public void deleteGroup(UUID id) { jedis.del(GROUP_PFX + id); }
    public void deletePost(UUID id)  { jedis.del(POST_PFX  + id); }

    // ── Search Operations - Các tác vụ Truy vấn Tìm kiếm ───────────────────────────────────────────────

    /**
     * Tìm kiếm người dùng theo từ khóa.
     */
    public List<Document> searchUsers(String rawQuery, int limit) {
        return ftSearch(USER_IDX, rawQuery, limit);
    }

    /**
     * Tìm kiếm nhóm theo từ khóa.
     */
    public List<Document> searchGroups(String rawQuery, int limit) {
        return ftSearch(GROUP_IDX, rawQuery, limit);
    }

    /**
     * Tìm kiếm bài đăng công khai. Chỉ lấy bài viết ở chế độ PUBLIC và trạng thái PUBLISHED.
     */
    public List<Document> searchPosts(String rawQuery, int limit) {
        String term = buildTerm(normalize(rawQuery));
        // Lọc kết hợp tìm kiếm từ khóa kèm theo bộ lọc TAG trạng thái
        String queryStr = "(@s_content:" + term + ") (@privacy:{public}) (@status:{published})";
        Query q = new Query(queryStr)
                .setSortBy("publishedAt", false) // Sắp xếp bài đăng mới nhất lên đầu
                .limit(0, limit);
        return jedis.ftSearch(POST_IDX, q).getDocuments();
    }

    // ── Helpers - Các phương thức bổ trợ ───────────────────────────────────────────────────────────────

    private List<Document> ftSearch(String idx, String rawQuery, int limit) {
        String term = buildTerm(normalize(rawQuery));
        Query q = new Query(term).limit(0, limit);
        return jedis.ftSearch(idx, q).getDocuments();
    }

    /**
     * Dựng cấu trúc câu truy vấn RediSearch hỗ trợ Progressive Typing (Tìm kiếm tiệm cận khi người dùng đang nhập).
     * Ví dụ:
     * - "nguyen" -> "nguyen*" (Khớp các từ bắt đầu bằng nguyen như Nguyễn, Nguyên, Nguyện)
     * - "nguyen van" -> "nguyen van*" (Mỗi từ cách nhau bằng khoảng trắng thể hiện phép toán AND, từ cuối cùng thêm wildcard *)
     */
    private String buildTerm(String normalizedQuery) {
        String[] words = normalizedQuery.trim().split("\\s+");
        if (words.length == 1) {
            return words[0] + "*";
        }
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < words.length - 1; i++) {
            parts.add(words[i]);
        }
        parts.add(words[words.length - 1] + "*");
        return String.join(" ", parts);
    }

    /**
     * Chuẩn hóa văn bản tiếng Việt: Chuyển về chữ thường, bỏ dấu và các ký tự đặc biệt.
     * Thuật toán: Sử dụng Normalizer.Form.NFD để tách nguyên âm và dấu riêng biệt,
     * sau đó dùng Regex loại bỏ toàn bộ dấu thanh Combining Diacritical Marks.
     * Ví dụ: "Nguyễn Văn Đức" -> "nguyen van duc"
     */
    public static String normalize(String text) {
        if (text == null || text.isBlank()) return "";
        // Chuyển ký tự đ/Đ thành d/d một cách chủ động (vì bộ Unicode NFD không tự tách đ thành d)
        String s = text.replace('đ', 'd').replace('Đ', 'd');
        String nfd = Normalizer.normalize(s, Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                  .toLowerCase()
                  .replaceAll("[^a-z0-9\\s]", " ") // Chỉ giữ lại chữ cái ASCII, chữ số và khoảng trắng
                  .replaceAll("\\s+", " ")          // Gộp các khoảng trắng thừa
                  .trim();
    }

    private static String safe(String s) {
        return s != null ? s : "";
    }
}
