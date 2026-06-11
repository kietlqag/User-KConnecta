package project.kconnecta.user.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,https://user-k-connecta.vercel.app}")
    private String allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                String[] origins = splitCsv(allowedOrigins);
                String[] patterns = splitCsv(allowedOrigins);
                var mapping = registry.addMapping("/api/**")
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("Authorization", "Content-Type")
                        .maxAge(3600);
                // Use allowedOriginPatterns when any entry contains a wildcard
                boolean hasPattern = Arrays.stream(origins).anyMatch(o -> o.contains("*"));
                if (hasPattern) {
                    mapping.allowedOriginPatterns(patterns);
                } else {
                    mapping.allowedOrigins(origins);
                }
            }
        };
    }

    private @NonNull String[] splitCsv(@Nullable String value) {
        if (value == null || value.isBlank()) {
            return new String[0];
        }

        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toArray(String[]::new);
    }
}
