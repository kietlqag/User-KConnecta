package project.kconnecta.user.backend.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.feature.settings.service.impl.SettingsServiceImpl;
import project.kconnecta.user.backend.common.util.JwtUtil;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserRepository userRepository;
    private final SettingsServiceImpl settingsServiceImpl;
    private final ObjectMapper objectMapper;
    private final AuthCookieService authCookieService;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) throws ServletException {
        String path = request.getServletPath();
        if (path == null || path.isBlank()) {
            path = request.getRequestURI();
        }

        // Skip OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Bypassing filter for public auth endpoints (except set-password)
        if (path.contains("/api/auth/") && !path.contains("/api/auth/set-password")) {
            return true;
        }

        // Bypassing filter for other public paths
        if (path.contains("/api/internal/") ||
            path.contains("/ws/") ||
            path.contains("/api/v1/policies/public") ||
            path.contains("/api/search/suggest") ||
            path.endsWith(".html")) {
            return true;
        }

        return false;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        String token = null;
        if (header != null && header.startsWith("Bearer ")) {
            token = header.substring(7);
        } else {
            token = authCookieService.readAccessToken(request).orElse(null);
        }

        if (token != null && !token.isBlank()) {

            if (!jwtUtil.isTokenValid(token) || tokenBlacklistService.isBlacklisted(token)) {
                sendUnauthorizedResponse(response, "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }

            Claims claims = jwtUtil.extractClaims(token);
            UUID sessionId = jwtUtil.extractSessionId(token);
            if (sessionId != null) {
                var sessionOpt = settingsServiceImpl.findSession(sessionId);
                if (sessionOpt.isPresent() && !sessionOpt.get().isActive()) {
                    sendUnauthorizedResponse(response, "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.");
                    return;
                }
                if (sessionOpt.isPresent()) {
                    settingsServiceImpl.touchSession(sessionId);
                }
            }

            // JWT subject is the user id (see JwtUtil.generateToken), not the account id.
            UUID userId = UUID.fromString(claims.getSubject());

                Optional<User> userOpt = userRepository.findById(userId);
                User user = userOpt.orElse(null);
                Account account = user != null ? user.getAccount() : null;
                if (user == null || account == null || account.getStatus() != AccountStatus.ACTIVE) {
                    sendLockedResponse(response, user, account);
                    return;
                }

                UserPrincipal principal = new UserPrincipal(
                        userId,
                        claims.get("username", String.class));

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(principal, null,
                        Collections.emptyList());

                SecurityContextHolder.getContext().setAuthentication(auth);
        }

        chain.doFilter(request, response);
    }

    private void sendUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of("message", message)));
    }

    /**
     * 401 for an inactive account. For a BLOCKED account the body carries the lock reason,
     * unlock time and identity so the frontend can show the lock screen even when the user is
     * force-logged-out mid-session (the in-app notification is unreachable once logged out).
     */
    private void sendLockedResponse(HttpServletResponse response, User user, Account account) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> body = new HashMap<>();
        if (account != null && account.getStatus() == AccountStatus.BLOCKED) {
            body.put("message", "Tài khoản của bạn đã bị khóa.");
            body.put("accountStatus", "BLOCKED");
            body.put("blockedReason", account.getLockReason() != null && !account.getLockReason().isBlank()
                    ? account.getLockReason()
                    : "Tài khoản của bạn đang bị khóa do vi phạm hoặc cần admin xem xét.");
            body.put("lockedUntil", account.getLockedUntil());
            body.put("email", account.getEmail());
            if (user != null) {
                body.put("fullName", user.getFullName());
                body.put("username", user.getUsername());
            }
        } else {
            body.put("message", "Tài khoản không khả dụng hoặc không tồn tại.");
        }
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
