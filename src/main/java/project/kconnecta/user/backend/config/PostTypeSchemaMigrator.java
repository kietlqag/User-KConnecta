package project.kconnecta.user.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Adds {@code posts.post_type} and backfills legacy video-only posts as REEL so Watch
 * feed behavior stays consistent after separating posts from reels.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PostTypeSchemaMigrator implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) NOT NULL DEFAULT 'POST'"
            );
            jdbcTemplate.execute(
                    "UPDATE public.posts SET post_type = 'POST' WHERE post_type IS NULL OR post_type = ''"
            );

            int migrated = jdbcTemplate.update("""
                    UPDATE public.posts p
                    SET post_type = 'REEL'
                    WHERE p.post_type = 'POST'
                      AND NOT EXISTS (
                        SELECT 1 FROM post_media pm
                        WHERE pm.post_id = p.id AND pm.media_type = 'IMAGE'
                      )
                      AND (
                        EXISTS (
                          SELECT 1 FROM post_media pm
                          WHERE pm.post_id = p.id AND pm.media_type = 'VIDEO'
                        )
                        OR (
                          p.image_url IS NOT NULL
                          AND (
                            p.image_url ILIKE '%/video/%'
                            OR p.image_url ~* '\\.(mp4|mov|webm|m4v|ogg)(\\?.*)?$'
                          )
                        )
                      )
                    """);

            log.info("posts.post_type column ready; migrated {} legacy video-only posts to REEL", migrated);
        } catch (Exception e) {
            log.warn("Could not migrate posts.post_type: {}", e.getMessage());
        }
    }
}
