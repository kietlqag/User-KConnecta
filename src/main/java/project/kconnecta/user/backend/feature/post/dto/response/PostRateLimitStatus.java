package project.kconnecta.user.backend.feature.post.dto.response;

public record PostRateLimitStatus(
        int limitPerMinute,
        int usedInWindow,
        int remaining,
        long retryAfterSeconds,
        long windowSeconds
) {
}
