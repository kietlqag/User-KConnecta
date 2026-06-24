package project.kconnecta.user.backend.common.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration:86400000}") // 24h mặc định (giữ cho tương thích)
    private long expiration;

    @Value("${jwt.access-expiration:1800000}") // 30 phút — tuổi thọ access token khi dùng refresh token
    private long accessExpiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UUID userId, String username) {
        return generateToken(userId, username, null);
    }

    public String generateToken(UUID userId, String username, UUID sessionId) {
        var builder = Jwts.builder()
                .subject(userId.toString())
                .claim("username", username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpiration));
        if (sessionId != null) {
            builder.claim("sid", sessionId.toString());
        }
        return builder.signWith(getSigningKey()).compact();
    }

    public UUID extractSessionId(String token) {
        Claims claims = extractClaims(token);
        String sid = claims.get("sid", String.class);
        return sid != null ? UUID.fromString(sid) : null;
    }

    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(extractClaims(token).getSubject());
    }

    public String extractUsername(String token) {
        return extractClaims(token).get("username", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
