package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TwoFactorPendingService {

    private static final String PREFIX = "2fa-pending:";
    private static final Duration TTL = Duration.ofMinutes(5);

    private final RedisTemplate<String, Object> redisTemplate;

    public String createPendingLogin(UUID userId) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(PREFIX + token, userId.toString(), TTL);
        return token;
    }

    public UUID consumePendingLogin(String token) {
        String key = PREFIX + token;
        Object value = redisTemplate.opsForValue().get(key);
        if (value == null) {
            return null;
        }
        redisTemplate.delete(key);
        return UUID.fromString(value.toString());
    }

    public UUID peekPendingLogin(String token) {
        Object value = redisTemplate.opsForValue().get(PREFIX + token);
        if (value == null) {
            return null;
        }
        return UUID.fromString(value.toString());
    }

    public void refreshPendingLogin(String token, UUID userId) {
        redisTemplate.opsForValue().set(PREFIX + token, userId.toString(), TTL);
    }
}
