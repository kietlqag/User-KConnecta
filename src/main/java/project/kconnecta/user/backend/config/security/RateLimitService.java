package project.kconnecta.user.backend.config.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Returns true if the caller has exceeded maxAttempts within the given window.
     * Fails open (returns false) if Redis is unavailable.
     */
    public boolean isRateLimited(String action, String identifier, int maxAttempts, Duration window) {
        String key = "rate:" + action + ":" + identifier;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, window);
            }
            return count != null && count > maxAttempts;
        } catch (Exception e) {
            return false;
        }
    }
}
