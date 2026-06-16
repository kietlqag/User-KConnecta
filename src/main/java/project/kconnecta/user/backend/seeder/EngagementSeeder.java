package project.kconnecta.user.backend.seeder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

/**
 * Sinh reaction / comment / share ngẫu nhiên cho posts seed.
 * Insert native qua JdbcTemplate để backdate created_at (entity @PrePersist ghi đè now)
 * và tránh bắn notification / moderation. Chỉ dùng cho dữ liệu seed.
 */
@Slf4j
@Component
@Profile({"dev", "local"})
@RequiredArgsConstructor
public class EngagementSeeder {

    private final JdbcTemplate jdbcTemplate;

    private static final int MAX_REACTIONS = 40;
    private static final int MAX_COMMENTS = 12;
    private static final int MAX_SHARES = 6;

    // reaction_type random có trọng số: LIKE phổ biến nhất.
    private static final ReactionType[] REACTION_WEIGHTED = {
        ReactionType.LIKE, ReactionType.LIKE, ReactionType.LIKE, ReactionType.LIKE, ReactionType.LIKE,
        ReactionType.LOVE, ReactionType.LOVE,
        ReactionType.HAHA, ReactionType.HAHA,
        ReactionType.WOW,
        ReactionType.SAD,
        ReactionType.ANGRY
    };

    private static final String[] COMMENT_TEMPLATES = {
        "Hay quá!", "Cảm ơn bạn đã chia sẻ 👍", "Đồng ý với bạn luôn", "Quá đúng luôn 😄",
        "Mình cũng nghĩ vậy", "Tuyệt vời ông mặt trời", "Bài viết hữu ích ghê", "Like mạnh nha bạn",
        "Cho mình xin info với", "Wow hay đó", "Đỉnh thật sự", "Mình lưu lại để xem sau",
        "Chuẩn không cần chỉnh", "Quá hợp lý", "Cảm ơn đã review chi tiết nhé", "Để mình thử xem sao",
        "Góc nhìn hay đấy", "Ủng hộ bạn 💪"
    };

    private static final String INSERT_REACTION =
        "INSERT INTO public.post_reactions (id, post_id, user_id, reaction_type, created_at, updated_at) "
        + "VALUES (?, ?, ?, ?, ?, ?)";
    private static final String INSERT_COMMENT =
        "INSERT INTO public.post_comments (id, post_id, user_id, parent_comment_id, is_deleted, content, "
        + "status, moderation_fail_reason, moderation_attempts, created_at, updated_at) "
        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    private static final String INSERT_SHARE =
        "INSERT INTO public.post_shares (id, post_id, user_id, shared_content, privacy, created_at) "
        + "VALUES (?, ?, ?, ?, ?, ?)";

    private static final String SELECT_POSTS_WITH_ENGAGEMENT =
        "SELECT post_id FROM public.post_reactions "
        + "UNION SELECT post_id FROM public.post_comments "
        + "UNION SELECT post_id FROM public.post_shares";

    /** Số row đã sinh, trả về cho controller để báo cáo. */
    public record Stats(int reactions, int comments, int shares) {}

    /**
     * Seed engagement chỉ cho các post CHƯA có react/comment/share nào.
     * Idempotent: chạy lại không chồng thêm lên post đã có tương tác.
     */
    public Stats seedMissing(List<Post> posts, List<User> users) {
        Set<UUID> hasEngagement = new HashSet<>(
                jdbcTemplate.queryForList(SELECT_POSTS_WITH_ENGAGEMENT, UUID.class));

        List<Post> targets = new ArrayList<>(posts.size());
        for (Post p : posts) {
            if (!hasEngagement.contains(p.getId())) {
                targets.add(p);
            }
        }

        log.info("EngagementSeeder: {} posts, {} đã có engagement, seed cho {} post còn lại.",
                posts.size(), hasEngagement.size(), targets.size());
        return seedFor(targets, users);
    }

    public Stats seedFor(List<Post> posts, List<User> users) {
        Random random = new Random();
        LocalDateTime now = LocalDateTime.now();

        List<Object[]> reactionRows = new ArrayList<>();
        List<Object[]> commentRows = new ArrayList<>();
        List<Object[]> shareRows = new ArrayList<>();

        for (Post post : posts) {
            // Bỏ qua bài PRIVATE: bài riêng tư mà có người lạ tương tác trông sai.
            if (post.getPrivacy() == PostPrivacy.PRIVATE) {
                continue;
            }

            UUID authorId = post.getAuthor().getId();
            List<UUID> pool = new ArrayList<>(users.size());
            for (User u : users) {
                if (!u.getId().equals(authorId)) {
                    pool.add(u.getId());
                }
            }
            if (pool.isEmpty()) {
                continue;
            }

            LocalDateTime publishedAt = post.getPublishedAt() != null ? post.getPublishedAt() : now;

            // Reactions: user phân biệt, cap theo pool.
            int reactionCount = Math.min(random.nextInt(MAX_REACTIONS + 1), pool.size());
            for (UUID userId : pickDistinct(pool, reactionCount, random)) {
                Timestamp at = randomTimestamp(publishedAt, now, random);
                ReactionType type = REACTION_WEIGHTED[random.nextInt(REACTION_WEIGHTED.length)];
                reactionRows.add(new Object[]{
                    UUID.randomUUID(), post.getId(), userId, type.name(), at, at
                });
            }

            // Comments: cho phép trùng user.
            int commentCount = random.nextInt(MAX_COMMENTS + 1);
            for (int i = 0; i < commentCount; i++) {
                UUID userId = pool.get(random.nextInt(pool.size()));
                Timestamp at = randomTimestamp(publishedAt, now, random);
                String content = COMMENT_TEMPLATES[random.nextInt(COMMENT_TEMPLATES.length)];
                commentRows.add(new Object[]{
                    UUID.randomUUID(), post.getId(), userId, null, Boolean.FALSE, content,
                    "APPROVED", null, 0, at, at
                });
            }

            // Shares: user phân biệt, cap theo pool.
            int shareCount = Math.min(random.nextInt(MAX_SHARES + 1), pool.size());
            for (UUID userId : pickDistinct(pool, shareCount, random)) {
                Timestamp at = randomTimestamp(publishedAt, now, random);
                shareRows.add(new Object[]{
                    UUID.randomUUID(), post.getId(), userId, null, "PUBLIC", at
                });
            }
        }

        if (!reactionRows.isEmpty()) jdbcTemplate.batchUpdate(INSERT_REACTION, reactionRows);
        if (!commentRows.isEmpty()) jdbcTemplate.batchUpdate(INSERT_COMMENT, commentRows);
        if (!shareRows.isEmpty()) jdbcTemplate.batchUpdate(INSERT_SHARE, shareRows);

        log.info("EngagementSeeder: {} reactions, {} comments, {} shares across {} posts.",
                reactionRows.size(), commentRows.size(), shareRows.size(), posts.size());

        return new Stats(reactionRows.size(), commentRows.size(), shareRows.size());
    }

    /** Chọn {@code count} phần tử phân biệt từ pool (không sửa pool). */
    private Set<UUID> pickDistinct(List<UUID> pool, int count, Random random) {
        if (count <= 0) {
            return Collections.emptySet();
        }
        if (count >= pool.size()) {
            return new LinkedHashSet<>(pool);
        }
        Set<UUID> chosen = new LinkedHashSet<>(count);
        while (chosen.size() < count) {
            chosen.add(pool.get(random.nextInt(pool.size())));
        }
        return chosen;
    }

    /** Thời điểm random trong [from, to]. */
    private Timestamp randomTimestamp(LocalDateTime from, LocalDateTime to, Random random) {
        long seconds = Duration.between(from, to).getSeconds();
        LocalDateTime at = seconds <= 0 ? from : from.plusSeconds(random.nextLong(seconds + 1));
        return Timestamp.valueOf(at);
    }
}
