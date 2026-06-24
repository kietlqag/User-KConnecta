package project.kconnecta.user.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Drops and recreates notifications_type_check whenever new NotificationType enum values are added,
 * because Hibernate ddl-auto:update does not update CHECK constraints automatically.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationSchemaFix implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    private static final String ALL_TYPES =
            "'LIKE','COMMENT','SHARE'," +
            "'FRIEND_REQUEST','FRIEND_ACCEPTED','FRIEND_REMOVED'," +
            "'GROUP_ACTIVITY','GROUP_INVITE','GROUP_JOIN_REQUEST','GROUP_POST_PINNED'," +
            "'MENTION','BIRTHDAY','BIRTHDAY_WISH','EVENT','MEMORY','SYSTEM'";

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute(
                "ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check"
            );
            jdbcTemplate.execute(
                "ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check " +
                "CHECK (type IN (" + ALL_TYPES + "))"
            );
            log.info("notifications_type_check constraint updated");
        } catch (Exception e) {
            log.warn("Could not update notifications_type_check: {}", e.getMessage());
        }
    }
}
