package project.kconnecta.user.backend.seeder;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import project.kconnecta.user.backend.Application;

/**
 * Chạy seed MEDIA (ảnh + video) độc lập — KHÔNG chạy khi khởi động app bình thường.
 * Phần like/comment/share tách riêng ở {@link EngagementSeedRunner}.
 *
 * Boot Spring context như app thật nhưng trên cổng ngẫu nhiên (server.port=0)
 * để không đụng cổng nếu app đang chạy, gọi
 * {@link PostSeeder#fillMissingPostImages()} — gắn ảnh mẫu ngẫu nhiên cho post chưa
 * có ảnh/video, và {@link PostSeeder#convertSomePostsToVideo()} — chuyển ~20% post
 * ảnh sang video, rồi tự thoát.
 *
 * Không tạo post mới, không xóa gì. Muốn xóa & seed lại toàn bộ post thì dùng
 * endpoint /api/internal/seed/posts?force=true.
 *
 * Dùng full context (servlet) thay vì web=NONE vì các config web/security/websocket
 * (@EnableWebSecurity, @EnableWebSocketMessageBroker) cần servlet context để khởi tạo.
 * (Log "RedisSearch ... Socket closed" lúc thoát là vô hại — task reindex nền bị
 * đóng pool khi context shutdown, không ảnh hưởng việc seed.)
 *
 * Cách chạy:
 *   - IDE: Run main của class này (dùng cùng profile như app, mặc định "local").
 *   - Maven: ./mvnw spring-boot:run -Dspring-boot.run.main-class=project.kconnecta.user.backend.seeder.SeedRunner
 *
 * Cần các biến môi trường DB như khi chạy app (DB_URL, DB_USERNAME, ...).
 */
public class SeedRunner {

    public static void main(String[] args) {
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(Application.class)
                .properties("server.port=0")
                .run(args)) {
            PostSeeder seeder = ctx.getBean(PostSeeder.class);
            seeder.fillMissingPostImages();
            seeder.convertSomePostsToVideo();
        }
        // Đóng context xong thì thoát hẳn (tránh thread pool nền giữ JVM sống).
        System.exit(0);
    }
}
