package project.kconnecta.user.backend.feature.auth.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.exception.InvalidRefreshTokenException;
import project.kconnecta.user.backend.exception.RefreshTokenReuseException;
import project.kconnecta.user.backend.feature.auth.service.RefreshTokenService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private static final Duration REFRESH_TTL = Duration.ofDays(7);
    private static final String KEY_PREFIX = "refresh:";
    private static final String USER_SET_PREFIX = "user-sessions:";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64D = Base64.getUrlDecoder();

    private final StringRedisTemplate redis;

    @Override
    public String issue(UUID userId, UUID sid) {
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        String hash = sha256Hex(secret);
        redis.opsForValue().set(KEY_PREFIX + sid, userId + ":" + hash, REFRESH_TTL);
        redis.opsForSet().add(USER_SET_PREFIX + userId, sid.toString());
        redis.expire(USER_SET_PREFIX + userId, REFRESH_TTL);
        return B64.encodeToString(sid.toString().getBytes(StandardCharsets.UTF_8))
                + "." + B64.encodeToString(secret);
    }

    @Override
    public RotationResult rotate(String rawRefreshToken) {
        if (rawRefreshToken == null || !rawRefreshToken.contains(".")) {
            throw new InvalidRefreshTokenException("Refresh token khong hop le");
        }
        String[] parts = rawRefreshToken.split("\\.", 2);
        UUID sid;
        byte[] secret;
        try {
            sid = UUID.fromString(new String(B64D.decode(parts[0]), StandardCharsets.UTF_8));
            secret = B64D.decode(parts[1]);
        } catch (Exception e) {
            throw new InvalidRefreshTokenException("Refresh token khong hop le");
        }

        String stored = redis.opsForValue().get(KEY_PREFIX + sid);
        if (stored == null) {
            throw new InvalidRefreshTokenException("Refresh token het han hoac da bi thu hoi");
        }
        int sep = stored.indexOf(':');
        UUID userId = UUID.fromString(stored.substring(0, sep));
        String storedHash = stored.substring(sep + 1);

        if (!MessageDigest.isEqual(
                storedHash.getBytes(StandardCharsets.UTF_8),
                sha256Hex(secret).getBytes(StandardCharsets.UTF_8))) {
            // Token cũ đã bị xoay nhưng vẫn được dùng lại → nghi bị đánh cắp.
            redis.delete(KEY_PREFIX + sid);
            throw new RefreshTokenReuseException("Phat hien tai dung refresh token; da thu hoi phien");
        }

        String newToken = issue(userId, sid); // ghi đè hash → token cũ vô hiệu
        return new RotationResult(userId, sid, newToken);
    }

    @Override
    public void revoke(UUID sid) {
        redis.delete(KEY_PREFIX + sid);
    }

    @Override
    public void revokeAllForUser(UUID userId) {
        Set<String> sids = redis.opsForSet().members(USER_SET_PREFIX + userId);
        if (sids != null) {
            for (String s : sids) {
                redis.delete(KEY_PREFIX + s);
            }
        }
        redis.delete(USER_SET_PREFIX + userId);
    }

    private static String sha256Hex(byte[] data) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(data);
            StringBuilder sb = new StringBuilder(d.length * 2);
            for (byte b : d) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
