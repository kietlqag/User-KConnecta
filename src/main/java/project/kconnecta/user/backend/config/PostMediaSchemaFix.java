package project.kconnecta.user.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures {@code post_media.media_type} accepts DOCUMENT alongside IMAGE and VIDEO.
 * Hibernate ddl-auto does not update existing CHECK constraints when enums grow.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PostMediaSchemaFix implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    private static final String ALLOWED_TYPES = "'IMAGE', 'VIDEO', 'DOCUMENT'";

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE public.post_media DROP CONSTRAINT IF EXISTS post_media_media_type_check"
            );
            jdbcTemplate.execute(
                    "ALTER TABLE public.post_media ADD CONSTRAINT post_media_media_type_check " +
                            "CHECK (media_type IN (" + ALLOWED_TYPES + "))"
            );
            log.info("post_media_media_type_check constraint updated (IMAGE, VIDEO, DOCUMENT)");
        } catch (Exception e) {
            log.warn("Could not update post_media_media_type_check: {}", e.getMessage());
        }
    }
}
