package project.kconnecta.user.backend.config;

import lombok.extern.slf4j.Slf4j;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Backfills {@code stories.privacy} before Hibernate ddl-auto tries to enforce NOT NULL.
 */
@Slf4j
public final class StoryPrivacySchemaMigrator {

    private StoryPrivacySchemaMigrator() {
    }

    public static void migrate(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection()) {
            migrate(connection);
        } catch (Exception e) {
            log.warn("Could not apply stories.privacy schema migration: {}", e.getMessage());
        }
    }

    public static void migrate(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    ALTER TABLE public.stories
                    ADD COLUMN IF NOT EXISTS privacy VARCHAR(255)
                    """);
            statement.execute("""
                    UPDATE public.stories
                    SET privacy = 'PUBLIC'
                    WHERE privacy IS NULL
                    """);
            statement.execute("""
                    ALTER TABLE public.stories
                    ALTER COLUMN privacy SET DEFAULT 'PUBLIC'
                    """);
            statement.execute("""
                    ALTER TABLE public.stories
                    ALTER COLUMN privacy SET NOT NULL
                    """);
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS public.story_audience_allowances (
                        id UUID PRIMARY KEY,
                        story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
                        allowed_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                        CONSTRAINT uk_story_allowance UNIQUE (story_id, allowed_user_id)
                    )
                    """);
            statement.execute("""
                    CREATE INDEX IF NOT EXISTS idx_story_audience_allowances_story
                    ON public.story_audience_allowances(story_id)
                    """);
            statement.execute("""
                    CREATE INDEX IF NOT EXISTS idx_story_audience_allowances_user
                    ON public.story_audience_allowances(allowed_user_id)
                    """);
            log.info("stories.privacy schema migration applied");
        }
    }
}
