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

    @Value("${app.cors.allowed-origin-patterns:https://*.vercel.app}")
    private String allowedOriginPatterns;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(splitCsv(allowedOrigins))
                        .allowedOriginPatterns(splitCsv(allowedOriginPatterns))
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .maxAge(3600);
            }
        };
    }

    private @NonNull String[] splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return new String[0];
        }

        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toArray(String[]::new);
    }
}
