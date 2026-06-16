package project.kconnecta.user.backend.seeder;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import project.kconnecta.user.backend.Application;

/**
 * Chạy seed độc lập — KHÔNG chạy khi khởi động app bình thường.
 *
 * Boot Spring context như app thật nhưng trên cổng ngẫu nhiên (server.port=0)
 * để không đụng cổng nếu app đang chạy, gọi
 * {@link PostSeeder#seedEngagementForExistingPosts()} — thêm react/comment/share
 * ngẫu nhiên cho các post ĐÃ CÓ trong DB (bỏ qua post đã có engagement), và
 * {@link PostSeeder#fillMissingPostImages()} — gắn ảnh mẫu cho post chưa có ảnh/video,
 * rồi tự thoát.
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
            seeder.seedEngagementForExistingPosts();
            seeder.fillMissingPostImages();
            seeder.convertSomePostsToVideo();
        }
        // Đóng context xong thì thoát hẳn (tránh thread pool nền giữ JVM sống).
        System.exit(0);
    }
}
