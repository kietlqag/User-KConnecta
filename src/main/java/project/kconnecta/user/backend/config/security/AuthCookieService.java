package project.kconnecta.user.backend.config.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;

/** HttpOnly auth cookies — tokens are not exposed to JavaScript. */
@Service
public class AuthCookieService {

    public static final String ACCESS_COOKIE = "kc_at";
    public static final String REFRESH_COOKIE = "kc_rt";

    private final boolean secure;
    private final String sameSite;
    private final long accessMaxAgeSeconds;
    private final long refreshMaxAgeSeconds;

    public AuthCookieService(
            @Value("${app.auth.cookies.secure:false}") boolean secure,
            @Value("${app.auth.cookies.same-site:Lax}") String sameSite,
            @Value("${jwt.access-expiration:1800000}") long accessExpirationMs,
            @Value("${app.auth.cookies.refresh-max-age-days:30}") int refreshMaxAgeDays) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.accessMaxAgeSeconds = Math.max(1, accessExpirationMs / 1000);
        this.refreshMaxAgeSeconds = Duration.ofDays(refreshMaxAgeDays).getSeconds();
    }

    public void writeAuthCookies(
            HttpServletResponse response,
            String accessToken,
            String refreshToken,
            boolean rememberMe) {
        if (accessToken != null && !accessToken.isBlank()) {
            response.addHeader("Set-Cookie", buildCookie(ACCESS_COOKIE, accessToken, accessMaxAgeSeconds).toString());
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            if (rememberMe) {
                response.addHeader("Set-Cookie", buildCookie(REFRESH_COOKIE, refreshToken, refreshMaxAgeSeconds).toString());
            } else {
                response.addHeader("Set-Cookie", buildSessionCookie(REFRESH_COOKIE, refreshToken).toString());
            }
        }
    }

    public void clearAuthCookies(HttpServletResponse response) {
        response.addHeader("Set-Cookie", buildCookie(ACCESS_COOKIE, "", 0).toString());
        response.addHeader("Set-Cookie", buildCookie(REFRESH_COOKIE, "", 0).toString());
    }

    public Optional<String> readAccessToken(HttpServletRequest request) {
        return readCookie(request, ACCESS_COOKIE);
    }

    public Optional<String> readRefreshToken(HttpServletRequest request) {
        return readCookie(request, REFRESH_COOKIE);
    }

    public Optional<String> resolveAccessToken(String authorizationHeader, HttpServletRequest request) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String token = authorizationHeader.substring(7).trim();
            if (!token.isEmpty()) {
                return Optional.of(token);
            }
        }
        return readAccessToken(request);
    }

    private Optional<String> readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .filter(v -> v != null && !v.isBlank())
                .findFirst();
    }

    private ResponseCookie buildCookie(String name, String value, long maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .sameSite(sameSite)
                .maxAge(maxAgeSeconds)
                .build();
    }

    private ResponseCookie buildSessionCookie(String name, String value) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .sameSite(sameSite)
                .build();
    }
}
