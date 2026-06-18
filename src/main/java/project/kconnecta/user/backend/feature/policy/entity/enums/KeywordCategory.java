package project.kconnecta.user.backend.feature.policy.entity.enums;

import java.util.Locale;

public enum KeywordCategory {
    BLACKLIST,
    WATCHLIST,
    BLOCKED_DOMAIN;

    public static KeywordCategory fromJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return BLACKLIST;
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "watchlist", "sensitive" -> WATCHLIST;
            case "blocked_domain" -> BLOCKED_DOMAIN;
            default -> BLACKLIST;
        };
    }

    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
