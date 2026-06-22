package project.kconnecta.user.backend.feature.search.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisSearchIndexer {

    public static final String USER_IDX   = "user-idx";
    public static final String GROUP_IDX  = "group-idx";
    public static final String POST_IDX   = "post-idx";

    public static final String USER_PFX   = "user:";
    public static final String GROUP_PFX  = "group:";
    public static final String POST_PFX   = "post:";

    private final JedisPooled jedis;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final PostRepository postRepository;

    // ── Startup ───────────────────────────────────────────────────────────────

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            createIndexes();
            reindexAllWithRetry(3, 3_000);
        } catch (Exception e) {
            log.error("[RedisSearch] Startup indexing failed — search will fall back gracefully: {}", e.getMessage());
        }
    }

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

    // ── Index creation ────────────────────────────────────────────────────────

    public void createIndexes() {
        createUserIndex();
        createGroupIndex();
        createPostIndex();
        log.info("[RedisSearch] Indexes ready");
    }

    private void createUserIndex() {
        try {
            jedis.ftCreate(USER_IDX,
                FTCreateParams.createParams().on(IndexDataType.HASH).prefix(USER_PFX),
                new SchemaField[]{
                    TextField.of("s_name").weight(5.0),
                    TextField.of("s_username").weight(2.0),
                    TextField.of("s_bio").weight(1.0)
                }
            );
        } catch (JedisDataException e) {
            if (!e.getMessage().contains("already exists")) {
                log.warn("[RedisSearch] createUserIndex: {}", e.getMessage());
            }
        }
    }

    private void createGroupIndex() {
        try {
            jedis.ftCreate(GROUP_IDX,
                    FTCreateParams.createParams().on(IndexDataType.HASH).prefix(GROUP_PFX),
                new SchemaField[]{
                    TextField.of("s_name").weight(5.0),
                    TextField.of("s_description").weight(1.0),
                    TagField.of("privacy")
                }
            );
        } catch (JedisDataException e) {
            if (!e.getMessage().contains("already exists")) {
                log.warn("[RedisSearch] createGroupIndex: {}", e.getMessage());
            }
        }
    }

    private void createPostIndex() {
        try {
            jedis.ftCreate(POST_IDX,
                    FTCreateParams.createParams().on(IndexDataType.HASH).prefix(POST_PFX),
                new SchemaField[]{
                    TextField.of("s_content"),
                    TagField.of("privacy"),
                    TagField.of("status"),
                    NumericField.of("publishedAt").sortable()
                }
            );
        } catch (JedisDataException e) {
            if (!e.getMessage().contains("already exists")) {
                log.warn("[RedisSearch] createPostIndex: {}", e.getMessage());
            }
        }
    }

    // ── Full reindex ──────────────────────────────────────────────────────────

    public void reindexAll() {
        long start = System.currentTimeMillis();

        List<UserRepository.UserSearchProjection> users = userRepository.findAllSearchProjections();
        users.forEach(this::indexUser);

        List<Group> groups = groupRepository.findAll();
        groups.forEach(this::indexGroup);

        List<Post> posts = postRepository.findAllPublishedPublicWithAuthorAndGroup();
        posts.forEach(this::indexPost);

        log.info("[RedisSearch] Reindexed {} users, {} groups, {} posts in {}ms",
                users.size(), groups.size(), posts.size(),
                System.currentTimeMillis() - start);
    }

    // ── Index single document ─────────────────────────────────────────────────

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

    private void indexUser(UUID userId, String fullName, String username, String avatarUrl, String bio) {
        try {
            Map<String, String> h = new HashMap<>();
            h.put("fullName",  safe(fullName));
            h.put("username",  safe(username));
            h.put("avatarUrl", safe(avatarUrl));
            h.put("bio",       safe(bio));
            h.put("s_name",     normalize(fullName));
            h.put("s_username", normalize(username));
            h.put("s_bio",      normalize(bio));
            jedis.hset(USER_PFX + userId, h);
        } catch (Exception e) {
            log.debug("[RedisSearch] indexUser {} failed: {}", userId, e.getMessage());
        }
    }

    public void indexGroup(Group group) {
        try {
            Map<String, String> h = new HashMap<>();
            h.put("name",          safe(group.getName()));
            h.put("coverPhotoUrl", safe(group.getCoverPhotoUrl()));
            h.put("privacy",       group.getPrivacy().name().toLowerCase());
            h.put("s_name",        normalize(group.getName()));
            h.put("s_description", normalize(group.getDescription()));
            jedis.hset(GROUP_PFX + group.getId(), h);
        } catch (Exception e) {
            log.debug("[RedisSearch] indexGroup {} failed: {}", group.getId(), e.getMessage());
        }
    }

    public void indexPost(Post post) {
        try {
            // Posts inside a private group must never be searchable by non-members.
            boolean inPrivateGroup = post.getGroup() != null
                    && post.getGroup().getPrivacy() == GroupPrivacy.PRIVATE;
            if (post.getStatus() != PostStatus.PUBLISHED || post.getPrivacy() != PostPrivacy.PUBLIC || inPrivateGroup) {
                deletePost(post.getId());
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

    // ── Delete document ───────────────────────────────────────────────────────

    public void deleteUser(UUID id)  { jedis.del(USER_PFX  + id); }
    public void deleteGroup(UUID id) { jedis.del(GROUP_PFX + id); }
    public void deletePost(UUID id)  { jedis.del(POST_PFX  + id); }

    // ── Search ────────────────────────────────────────────────────────────────

    public List<Document> searchUsers(String rawQuery, int limit) {
        return ftSearch(USER_IDX, rawQuery, limit);
    }

    public List<Document> searchGroups(String rawQuery, int limit) {
        return ftSearch(GROUP_IDX, rawQuery, limit);
    }

    /**
     * Search PUBLIC PUBLISHED posts only — filter is applied via TAG fields.
     */
    public List<Document> searchPosts(String rawQuery, int limit) {
        String term = buildTerm(normalize(rawQuery));
        String queryStr = "(@s_content:" + term + ") (@privacy:{public}) (@status:{published})";
        Query q = new Query(queryStr)
                .setSortBy("publishedAt", false)
                .limit(0, limit);
        return jedis.ftSearch(POST_IDX, q).getDocuments();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<Document> ftSearch(String idx, String rawQuery, int limit) {
        String term = buildTerm(normalize(rawQuery));
        Query q = new Query(term).limit(0, limit);
        return jedis.ftSearch(idx, q).getDocuments();
    }

    /**
     * Builds a RediSearch query string that supports:
     * - "nguyen" → matches token "nguyen"
     * - "nguyen van" → each word matched as prefix: "nguyen* | van*"
     *   allowing partial input from either token
     */
    private String buildTerm(String normalizedQuery) {
        String[] words = normalizedQuery.trim().split("\\s+");
        if (words.length == 1) {
            return words[0] + "*";
        }
        // All words joined with AND, last word as prefix for progressive typing
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < words.length - 1; i++) {
            parts.add(words[i]);
        }
        parts.add(words[words.length - 1] + "*");
        return String.join(" ", parts);
    }

    /**
     * Strips Vietnamese diacritics and normalizes to lowercase ASCII.
     * "Nguyễn Văn Đức" → "nguyen van duc"
     */
    public static String normalize(String text) {
        if (text == null || text.isBlank()) return "";
        String s = text.replace('đ', 'd').replace('Đ', 'd');
        String nfd = Normalizer.normalize(s, Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                  .toLowerCase()
                  .replaceAll("[^a-z0-9\\s]", " ")
                  .replaceAll("\\s+", " ")
                  .trim();
    }

    private static String safe(String s) {
        return s != null ? s : "";
    }
}
