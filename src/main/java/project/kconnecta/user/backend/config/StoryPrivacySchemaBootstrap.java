package project.kconnecta.user.backend.config;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.List;

/**
 * Runs before Spring Boot so Hibernate never sees NULL {@code stories.privacy} rows.
 */
@Slf4j
public final class StoryPrivacySchemaBootstrap {

    private StoryPrivacySchemaBootstrap() {
    }

    public static void migrateBeforeStartup() {
        String url = resolve("DB_URL");
        log.info("stories.privacy pre-migration: Resolved DB_URL = {}", url);
        if (url == null || url.isBlank()) {
            log.debug("Skipping stories.privacy pre-migration: DB_URL is not set");
            return;
        }

        String username = resolve("DB_USERNAME");
        String password = resolve("DB_PASSWORD");
        if (username == null) {
            username = "";
        }
        if (password == null) {
            password = "";
        }

        try {
            Class.forName("org.postgresql.Driver");
            try (var connection = DriverManager.getConnection(url, username, password)) {
                StoryPrivacySchemaMigrator.migrate(connection);
            }
        } catch (Exception e) {
            throw new IllegalStateException("stories.privacy schema pre-migration failed", e);
        }
    }

    private static String resolve(String key) {
        String fromEnv = System.getenv(key);
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv;
        }
        for (Path envPath : List.of(
                Path.of(System.getProperty("user.dir"), ".env"),
                Path.of(System.getProperty("user.dir"), "User_backend", ".env")
        )) {
            String fromFile = readDotEnvValue(envPath, key);
            if (fromFile != null && !fromFile.isBlank()) {
                return fromFile;
            }
        }
        return null;
    }

    private static String readDotEnvValue(Path envPath, String key) {
        if (!Files.isRegularFile(envPath)) {
            return null;
        }
        try {
            for (String line : Files.readAllLines(envPath)) {
                String trimmed = line.strip();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int separator = trimmed.indexOf('=');
                if (separator <= 0) {
                    continue;
                }
                String envKey = trimmed.substring(0, separator).strip();
                if (!envKey.equals(key)) {
                    continue;
                }
                String value = trimmed.substring(separator + 1).strip();
                if ((value.startsWith("\"") && value.endsWith("\""))
                        || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }
                return value;
            }
        } catch (IOException e) {
            log.debug("Could not read {}: {}", envPath, e.getMessage());
        }
        return null;
    }
}
