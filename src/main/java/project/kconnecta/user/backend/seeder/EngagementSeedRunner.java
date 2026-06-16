package project.kconnecta.user.backend.seeder;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import project.kconnecta.user.backend.Application;

/**
 * Chạy seed RIÊNG cho like / comment / share — KHÔNG seed ảnh/video,
 * KHÔNG chạy khi khởi động app bình thường.
 *
 * Boot Spring context như app thật nhưng trên cổng ngẫu nhiên (server.port=0)
 * để không đụng cổng nếu app đang chạy, gọi
 * {@link PostSeeder#seedEngagementForExistingPosts()} (thêm react/comment/share
 * ngẫu nhiên cho post đã có, bỏ qua post đã có engagement), rồi tự thoát.
 *
 * Cách chạy:
 *   - IDE: Run main của class này.
 *   - Maven: ./mvnw spring-boot:run -Dspring-boot.run.main-class=project.kconnecta.user.backend.seeder.EngagementSeedRunner
 *
 * Cần các biến môi trường DB như khi chạy app. Phần ảnh/video chạy bằng SeedRunner.
 */
public class EngagementSeedRunner {

    public static void main(String[] args) {
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(Application.class)
                .properties("server.port=0")
                .run(args)) {
            ctx.getBean(PostSeeder.class).seedEngagementForExistingPosts();
        }
        System.exit(0);
    }
}
