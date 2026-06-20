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
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtUtil.isTokenValid(token) && !tokenBlacklistService.isBlacklisted(token)) {
                Claims claims = jwtUtil.extractClaims(token);
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
        }

        chain.doFilter(request, response);
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
