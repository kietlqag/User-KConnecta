package project.kconnecta.user.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    private static final String DEFAULT_ALLOWED_ORIGINS =
            "http://localhost:3000,http://127.0.0.1:3000,https://user-k-connecta.vercel.app";

    @Value("${app.cors.allowed-origins:" + DEFAULT_ALLOWED_ORIGINS + "}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = buildCorsConfiguration();
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        source.registerCorsConfiguration("/ws/**", configuration);
        return source;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                CorsConfiguration configuration = buildCorsConfiguration();
                var mapping = registry.addMapping("/api/**")
                        .allowedMethods(configuration.getAllowedMethods().toArray(String[]::new))
                        .allowedHeaders(configuration.getAllowedHeaders().toArray(String[]::new))
                        .maxAge(configuration.getMaxAge());

                if (configuration.getAllowedOriginPatterns() != null && !configuration.getAllowedOriginPatterns().isEmpty()) {
                    mapping.allowedOriginPatterns(configuration.getAllowedOriginPatterns().toArray(String[]::new));
                } else {
                    mapping.allowedOrigins(configuration.getAllowedOrigins().toArray(String[]::new));
                }
            }
        };
    }

    private CorsConfiguration buildCorsConfiguration() {
        String[] origins = splitCsv(allowedOrigins);
        boolean hasPattern = Arrays.stream(origins).anyMatch(origin -> origin.contains("*"));

        CorsConfiguration configuration = new CorsConfiguration();
        if (hasPattern) {
            configuration.setAllowedOriginPatterns(Arrays.asList(origins));
        } else {
            configuration.setAllowedOrigins(Arrays.asList(origins));
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        configuration.setMaxAge(3600L);
        return configuration;
    }

    private @NonNull String[] splitCsv(@Nullable String value) {
        if (value == null || value.isBlank()) {
            return splitCsv(DEFAULT_ALLOWED_ORIGINS);
        }

        String[] parsed = Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toArray(String[]::new);
        if (parsed.length == 0) {
            return splitCsv(DEFAULT_ALLOWED_ORIGINS);
        }
        return parsed;
    }
}
