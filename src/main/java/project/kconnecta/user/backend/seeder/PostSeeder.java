package project.kconnecta.user.backend.seeder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Slf4j
@Component
@Profile({"dev", "local"})
@RequiredArgsConstructor
public class PostSeeder {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final EngagementSeeder engagementSeeder;
    private final JdbcTemplate jdbcTemplate;

    // Bộ ảnh mẫu (Cloudinary demo) — gán ngẫu nhiên cho post để feed đa dạng.
    private static final String[] SAMPLE_IMAGE_URLS = {
        "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "https://res.cloudinary.com/demo/image/upload/cld-sample.jpg",
        "https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg",
        "https://res.cloudinary.com/demo/image/upload/cld-sample-3.jpg",
        "https://res.cloudinary.com/demo/image/upload/cld-sample-4.jpg",
        "https://res.cloudinary.com/demo/image/upload/cld-sample-5.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/landscapes/nature-mountains.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/landscapes/beach-boat.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/food/spices.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/food/pot-mussels.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/food/dessert.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/people/boy-snow-hoodie.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/people/kitchen-bar.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/people/jazz.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/animals/three-dogs.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/animals/cat.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/animals/reindeer.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/coffee.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/breakfast.jpg",
        "https://res.cloudinary.com/demo/image/upload/samples/balloons.jpg"
    };

    // Video mẫu (Cloudinary demo) cho một phần post.
    private static final String[] SAMPLE_VIDEO_URLS = {
        "https://res.cloudinary.com/demo/video/upload/dog.mp4",
        "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
        "https://res.cloudinary.com/demo/video/upload/elephants.mp4"
    };
    private static final int VIDEO_PERCENT = 20;

    private static final int POSTS_PER_CATEGORY = 100;
    private static final PostPrivacy[] PRIVACIES = {
        PostPrivacy.PUBLIC, PostPrivacy.PUBLIC, PostPrivacy.PUBLIC,
        PostPrivacy.FRIENDS, PostPrivacy.PRIVATE
    };

    private record Category(String name, String hashtag, String[] templates) {}

    private static final Category[] CATEGORIES = {
        new Category("Công nghệ", "#congnghe", new String[]{
            "Bạn đã thử %s chưa? Thực sự ấn tượng với tốc độ xử lý! #congnghe",
            "Vừa cài xong %s, cảm giác năng suất tăng vọt luôn 🚀 #congnghe",
            "AI đang thay đổi mọi thứ, đặc biệt là %s. Ý kiến mọi người thế nào? #congnghe",
            "Review nhanh %s sau 1 tuần dùng: đỉnh hơn mình nghĩ! #congnghe",
            "Tip nhỏ cho dev: dùng %s sẽ tiết kiệm được rất nhiều thời gian #congnghe",
            "Công nghệ %s đang hot nhất tuần này, ai đã thử chưa? #congnghe",
            "Update mới của %s có tính năng siêu hay, recommend mọi người thử #congnghe",
            "Học %s từ đầu mất bao lâu nhỉ? Mình đang plan học thêm #congnghe",
            "%s vs các giải pháp cũ: khác biệt rõ rệt luôn! #congnghe",
            "Đang nghiên cứu về %s, có ai biết resource tốt không? #congnghe"
        }),
        new Category("Ẩm thực", "#amthuc", new String[]{
            "Vừa thử quán %s ở quận 1, ngon không tưởng! Địa chỉ để trong comment #amthuc",
            "Tự nấu %s tại nhà, ra lò thơm lừng cả xóm 😂 #amthuc",
            "%s mùa này ăn ngon nhất, ai cùng đi không? #amthuc",
            "Review: %s giá hơi cao nhưng chất lượng xứng đáng #amthuc",
            "Công thức %s gia đình truyền lại, chia sẻ mọi người cùng biết #amthuc",
            "Món %s này khó làm vl nhưng ăn vào là quên hết mệt 🍜 #amthuc",
            "Cuối tuần rảnh, làm thử %s theo video YouTube, kết quả khá ổn #amthuc",
            "%s mà ăn kèm với nước chấm đặc biệt thì hết sẩy luôn #amthuc",
            "Đặt %s giao về nhà, còn nóng hổi và đúng ý lắm #amthuc",
            "Khám phá quán %s mới mở gần nhà, vibe rất chill #amthuc"
        }),
        new Category("Du lịch", "#dulich", new String[]{
            "Vừa về từ %s, đẹp hơn hình ảnh mạng nhiều! #dulich",
            "Check-in %s - khoảnh khắc bình yên giữa thiên nhiên 🌿 #dulich",
            "Kinh nghiệm du lịch %s tự túc 3 ngày 2 đêm, budget dưới 2 triệu #dulich",
            "%s vào mùa này đẹp lắm, đừng bỏ lỡ mọi người ơi #dulich",
            "Nhất định phải ghé %s một lần trong đời! #dulich",
            "Lần đầu đến %s, bỡ ngỡ nhưng thích lắm #dulich",
            "Lịch trình %s 4N3Đ cho nhóm bạn thân, chia sẻ để mọi người tham khảo #dulich",
            "Ăn gì khi đến %s? Top 5 món không thể bỏ qua #dulich",
            "Homestay ở %s view đẹp, giá hợp lý, chủ nhà thân thiện #dulich",
            "Đang lên kế hoạch khám phá %s, ai có kinh nghiệm chia sẻ với mình không? #dulich"
        }),
        new Category("Thể thao", "#thethao", new String[]{
            "Sáng nay chạy được %s km, cảm giác tuyệt vời! #thethao",
            "Trận %s tối qua đỉnh quá, ai xem cùng không? #thethao",
            "Gym buổi sáng với bài tập %s, cơ thể tỉnh táo hẳn #thethao",
            "%s mùa này đang vào mùa, không khí hừng hực lắm #thethao",
            "Review giày chạy bộ mới - dùng cho %s rất ổn #thethao",
            "30 ngày thử thách %s - kết quả sau 1 tháng kiên trì #thethao",
            "Tip cải thiện kỹ thuật %s cho người mới bắt đầu #thethao",
            "Đội %s hôm nay thi đấu ổn định, hy vọng vào sâu hơn #thethao",
            "Tham gia giải %s lần đầu, hồi hộp lắm nhưng vui vl #thethao",
            "Chấn thương %s thì nên làm gì? Ai có kinh nghiệm tư vấn mình #thethao"
        }),
        new Category("Giải trí", "#giaitri", new String[]{
            "Vừa xem xong %s, plot twist cuối không ai đoán được 😱 #giaitri",
            "Phim %s mới ra rạp, đi xem cuối tuần không? #giaitri",
            "Đang binge xem %s, không thể dừng được luôn #giaitri",
            "Game %s update mới có tính năng cực hay #giaitri",
            "%s: bộ phim định nghĩa lại thể loại này #giaitri",
            "Review sách %s: đọc xong thay đổi cách nhìn hoàn toàn #giaitri",
            "Hết phim rồi không biết xem gì, ai recommend %s giống thế này không? #giaitri",
            "Meme về %s này chuẩn không cần chỉnh 😂 #giaitri",
            "Concert %s tháng tới, ai đi cùng mình không? #giaitri",
            "Tập cuối của %s làm mình ngồi khóc một mình 😭 #giaitri"
        }),
        new Category("Sức khỏe", "#suckhoe", new String[]{
            "Chia sẻ thói quen %s giúp mình ngủ ngon hơn hẳn #suckhoe",
            "Uống %s mỗi sáng được 30 ngày, da dẻ thay đổi hẳn! #suckhoe",
            "Ai cũng nên biết về %s, quan trọng cho sức khỏe lắm #suckhoe",
            "Bỏ %s được 3 tháng, cơ thể khỏe hơn nhiều lắm #suckhoe",
            "%s mỗi ngày - thói quen nhỏ, lợi ích lớn #suckhoe",
            "Đi khám %s định kỳ đừng để bệnh mới chữa, tốn tiền hơn nhiều #suckhoe",
            "Ăn %s đúng cách để tối ưu dinh dưỡng #suckhoe",
            "Stress quá thì thử %s này, hiệu quả lắm #suckhoe",
            "Lịch tập %s cho người bận rộn chỉ 20 phút/ngày #suckhoe",
            "%s: hiểu đúng về nó để không bị mislead bởi thông tin sai #suckhoe"
        }),
        new Category("Giáo dục", "#giaoduc", new String[]{
            "Học %s online ở đâu tốt nhất? Mình đang research #giaoduc",
            "Kinh nghiệm ôn %s hiệu quả không cần thức khuya #giaoduc",
            "%s - kỹ năng quan trọng nhất thế kỷ 21 theo mình #giaoduc",
            "Review khóa học %s: worth it không? Mình đã học xong rồi #giaoduc",
            "Phương pháp học %s của mình, từ zero đến pass trong 3 tháng #giaoduc",
            "Sách %s này nên đọc trước khi ra trường #giaoduc",
            "Học %s một mình hay đi lớp? Ưu nhược điểm từng cách #giaoduc",
            "Tip ghi nhớ %s lâu mà không cần học vẹt #giaoduc",
            "Chứng chỉ %s có giá trị không trong thị trường hiện tại? #giaoduc",
            "Chia sẻ tài liệu %s miễn phí, link trong comment #giaoduc"
        }),
        new Category("Thời trang", "#thoitrang", new String[]{
            "Outfit hôm nay với %s - đơn giản mà vẫn stylish 👗 #thoitrang",
            "Review %s mới mua: chất lượng và giá cả như thế nào #thoitrang",
            "Mix đồ với %s theo phong cách này nhìn ổn không mọi người? #thoitrang",
            "%s phù hợp với body type nào? Chia sẻ kinh nghiệm nào #thoitrang",
            "Sale %s cuối mùa - mua gì thì nên mua lúc này #thoitrang",
            "Thương hiệu %s local nhưng chất lượng không thua hàng ngoại #thoitrang",
            "Xu hướng %s mùa này - bạn đã cập nhật chưa? #thoitrang",
            "Bảo quản %s đúng cách để dùng được lâu hơn #thoitrang",
            "%s second-hand vẫn còn mới, giá rẻ bằng một nửa #thoitrang",
            "Capsule wardrobe với %s - ít đồ mà vẫn nhiều outfit #thoitrang"
        }),
        new Category("Âm nhạc", "#amnhac", new String[]{
            "Bài %s này đang nghiện, nghe đi nghe lại không chán #amnhac",
            "Concert %s tháng này, ai đi không? Còn vé không? #amnhac",
            "Album mới của %s vừa ra, nghe xong thấy tâm hồn được nạp pin #amnhac",
            "Học đánh %s từ đầu khó không? Mình đang muốn học #amnhac",
            "Playlist %s tối qua chất lượng quá, share cho mọi người #amnhac",
            "%s bản acoustic hay hơn bản gốc không nhỉ? Nghe khác lắm #amnhac",
            "Ký ức gắn với bài %s này, nghe lại vẫn thấy bồi hồi #amnhac",
            "MV %s visual đẹp điên, xem đi mọi người #amnhac",
            "Cover %s này hay hơn bản chính thức không? Các bạn thấy sao #amnhac",
            "%s - bài nhạc perfect để học tập tập trung #amnhac"
        }),
        new Category("Gia đình", "#giadinh", new String[]{
            "Cuối tuần về thăm nhà, bữa cơm gia đình đơn giản mà ấm lòng #giadinh",
            "Dạy %s cho con nhỏ thế nào? Share kinh nghiệm với mình nhé #giadinh",
            "Khoảnh khắc gia đình quây quần - trân trọng từng giây phút này 🏠 #giadinh",
            "Ba mẹ đã %s để nuôi mình khôn lớn, cảm ơn ba mẹ nhiều lắm #giadinh",
            "Truyền thống gia đình mình là %s mỗi dịp lễ, bạn nhà bạn thì sao? #giadinh",
            "Làm gì khi %s giữa các thành viên trong gia đình? Kinh nghiệm xử lý #giadinh",
            "Kỳ nghỉ gia đình ở %s - kỷ niệm đáng nhớ nhất năm #giadinh",
            "%s là điều ý nghĩa nhất mình học được từ ông bà #giadinh",
            "Cân bằng giữa công việc và thời gian với %s - bí quyết của mình #giadinh",
            "Ảnh gia đình chụp hôm nay - không cần filter vẫn đẹp 📸 #giadinh"
        })
    };

    private static final String[] NOUNS = {
        "smartphone", "laptop", "framework mới", "ứng dụng", "thiết bị", "phần mềm",
        "API", "database", "cloud service", "tool hỗ trợ", "bộ môn này", "kỹ thuật mới",
        "sản phẩm", "giải pháp", "phương pháp", "chủ đề", "xu hướng", "nội dung"
    };

    @Transactional
    public void seed() {
        if (postRepository.count() > 0) {
            log.info("PostSeeder: posts already exist, skipping.");
            return;
        }

        List<User> users = userRepository.findAll();
        if (users.isEmpty()) {
            log.warn("PostSeeder: no users found, skipping.");
            return;
        }

        int totalPosts = CATEGORIES.length * POSTS_PER_CATEGORY;
        log.info("PostSeeder: seeding {} posts ({} categories × {} each) across {} users ...",
                 totalPosts, CATEGORIES.length, POSTS_PER_CATEGORY, users.size());

        Random random = new Random();
        List<Post> batch = new ArrayList<>(totalPosts);
        LocalDateTime now = LocalDateTime.now();

        for (Category category : CATEGORIES) {
            for (int i = 0; i < POSTS_PER_CATEGORY; i++) {
                // Pick a random user as author for each post
                User author = users.get(random.nextInt(users.size()));

                String template = category.templates()[i % category.templates().length];
                String noun = NOUNS[random.nextInt(NOUNS.length)];
                String content = template.formatted(noun);

                long minutesAgo = random.nextLong(180L * 24 * 60);
                LocalDateTime publishedAt = now.minusMinutes(minutesAgo);

                PostPrivacy privacy = PRIVACIES[random.nextInt(PRIVACIES.length)];

                Post post = Post.builder()
                    .author(author)
                    .content(content)
                    .privacy(privacy)
                    .status(PostStatus.PUBLISHED)
                    .promoted(false)
                    .createdAt(publishedAt)
                    .updatedAt(publishedAt)
                    .publishedAt(publishedAt)
                    .build();

                batch.add(post);
            }
        }

        postRepository.saveAllAndFlush(batch);
        log.info("PostSeeder: saved {} posts total.", batch.size());

        // Flush ở trên đảm bảo posts đã có trong DB trước khi insert engagement (FK post_id).
        engagementSeeder.seedFor(batch, users);
    }

    /**
     * Thêm react/comment/share ngẫu nhiên cho các post ĐÃ CÓ trong DB
     * (chỉ những post chưa có engagement). Không tạo post mới, không xóa gì.
     */
    @Transactional
    public void seedEngagementForExistingPosts() {
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) {
            log.warn("PostSeeder: no users found, skipping engagement seed.");
            return;
        }

        List<Post> posts = postRepository.findAll();
        if (posts.isEmpty()) {
            log.warn("PostSeeder: no posts found — nothing to add engagement to.");
            return;
        }

        EngagementSeeder.Stats stats = engagementSeeder.seedMissing(posts, users);
        log.info("PostSeeder: engagement seeded for existing posts — {} reactions, {} comments, {} shares.",
                stats.reactions(), stats.comments(), stats.shares());
    }

    /**
     * Gán ảnh mẫu NGẪU NHIÊN cho post chưa có media — gồm post chưa có ảnh
     * (image_url null) và post đang dùng một ảnh seed (để đa dạng hóa lại, tránh trùng).
     * Không đụng post đã có media (kể cả post video).
     */
    @Transactional
    public void fillMissingPostImages() {
        String inPlaceholders = String.join(",", Collections.nCopies(SAMPLE_IMAGE_URLS.length, "?"));
        List<UUID> targets = jdbcTemplate.queryForList(
                "SELECT id FROM public.posts "
                + "WHERE (image_url IS NULL OR image_url IN (" + inPlaceholders + ")) "
                + "AND id NOT IN (SELECT post_id FROM public.post_media)",
                UUID.class, (Object[]) SAMPLE_IMAGE_URLS);

        if (targets.isEmpty()) {
            log.info("PostSeeder: no posts need a sample image.");
            return;
        }

        Random random = new Random();
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        List<Object[]> rows = new ArrayList<>(targets.size());
        for (UUID id : targets) {
            String image = SAMPLE_IMAGE_URLS[random.nextInt(SAMPLE_IMAGE_URLS.length)];
            rows.add(new Object[]{image, now, id});
        }

        jdbcTemplate.batchUpdate(
                "UPDATE public.posts SET image_url = ?, updated_at = ? WHERE id = ?", rows);
        log.info("PostSeeder: assigned random sample image to {} posts.", rows.size());
    }

    /**
     * Chuyển ~{@value #VIDEO_PERCENT}% post đang dùng ảnh mẫu sang post video:
     * thêm post_media VIDEO (random 1 trong các link mẫu) và xóa image_url.
     * Idempotent: post đã có media không còn là ứng viên.
     */
    @Transactional
    public void convertSomePostsToVideo() {
        String inPlaceholders = String.join(",", Collections.nCopies(SAMPLE_IMAGE_URLS.length, "?"));
        List<UUID> candidates = jdbcTemplate.queryForList(
                "SELECT id FROM public.posts WHERE image_url IN (" + inPlaceholders + ") "
                + "AND id NOT IN (SELECT post_id FROM public.post_media)",
                UUID.class, (Object[]) SAMPLE_IMAGE_URLS);

        if (candidates.isEmpty()) {
            log.info("PostSeeder: no image-only posts to convert to video.");
            return;
        }

        Random random = new Random();
        Collections.shuffle(candidates, random);
        int count = Math.max(1, candidates.size() * VIDEO_PERCENT / 100);
        List<UUID> chosen = candidates.subList(0, Math.min(count, candidates.size()));

        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        List<Object[]> mediaRows = new ArrayList<>(chosen.size());
        List<Object[]> clearImageRows = new ArrayList<>(chosen.size());
        for (UUID postId : chosen) {
            String video = SAMPLE_VIDEO_URLS[random.nextInt(SAMPLE_VIDEO_URLS.length)];
            mediaRows.add(new Object[]{UUID.randomUUID(), postId, "VIDEO", video, null, 0, now});
            clearImageRows.add(new Object[]{now, postId});
        }

        jdbcTemplate.batchUpdate(
                "INSERT INTO public.post_media (id, post_id, media_type, file_url, thumbnail_url, sort_order, created_at) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?)", mediaRows);
        jdbcTemplate.batchUpdate(
                "UPDATE public.posts SET image_url = NULL, updated_at = ? WHERE id = ?", clearImageRows);

        log.info("PostSeeder: converted {} posts to video (out of {} image-only candidates).",
                chosen.size(), candidates.size());
    }
}
