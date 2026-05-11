package project.kconnecta.user.backend.config.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.common.util.JwtUtil;

import java.time.Duration;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";
    private final RedisTemplate<String, Object> redisTemplate;
    private final JwtUtil jwtUtil;

    public void blacklistToken(String token) {
        try {
            Date expirationDate = jwtUtil.extractClaims(token).getExpiration();
            long remainingTimeMs = expirationDate.getTime() - System.currentTimeMillis();

            if (remainingTimeMs > 0) {
                String key = BLACKLIST_PREFIX + token;
                redisTemplate.opsForValue().set(key, "true", Duration.ofMillis(remainingTimeMs));
            }
        } catch (Exception e) {
            // If token is already invalid or expired, no need to blacklist
        }
    }

    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) return false;
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
        } catch (Exception e) {
            return false;
        }
    }
}
