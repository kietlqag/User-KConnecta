package project.kconnecta.user.backend.feature.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.AuthCookieService;
import project.kconnecta.user.backend.config.security.RateLimitService;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.auth.dto.request.*;
import project.kconnecta.user.backend.feature.auth.dto.response.AuthResponse;
import project.kconnecta.user.backend.feature.auth.service.AuthService;
import project.kconnecta.user.backend.feature.auth.service.OtpService;
import project.kconnecta.user.backend.feature.user.dto.request.ResetPasswordRequest;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final OtpService otpService;
    private final AuthService authService;
    private final RateLimitService rateLimitService;
    private final AuthCookieService authCookieService;

    @Value("${app.trusted-proxy-ips:}")
    private String trustedProxyIps;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        if (rateLimitService.isRateLimited("send-otp", request.getEmail(), 3, Duration.ofMinutes(5))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        otpService.sendOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP da duoc gui den " + request.getEmail()));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        if (rateLimitService.isRateLimited("verify-otp", request.getEmail(), 5, Duration.ofMinutes(5))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        otpService.verifyOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of("verified", true));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String ip = resolveClientIp(httpRequest);
        if (rateLimitService.isRateLimited("register", ip, 10, Duration.ofHours(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        return authSuccess(authService.register(request), httpResponse, true);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String ip = resolveClientIp(httpRequest);
        if (rateLimitService.isRateLimited("login:ip", ip, 5, Duration.ofMinutes(15))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        if (rateLimitService.isRateLimited("login:email", request.getEmail(), 5, Duration.ofMinutes(15))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        boolean rememberMe = Boolean.TRUE.equals(request.getRememberMe());
        return authSuccess(authService.login(request, httpRequest), httpResponse, rememberMe);
    }

    @PostMapping("/verify-2fa-login")
    public ResponseEntity<?> verifyTwoFactorLogin(
            @Valid @RequestBody VerifyTwoFactorLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        return authSuccess(authService.verifyTwoFactorLogin(request, httpRequest), httpResponse, false);
    }

    @PostMapping("/resend-2fa-login")
    public ResponseEntity<?> resendTwoFactorLogin(@Valid @RequestBody ResendTwoFactorLoginRequest request) {
        if (rateLimitService.isRateLimited("resend-2fa", request.getTwoFactorToken(), 3, Duration.ofMinutes(5))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        authService.resendTwoFactorLogin(request);
        return ResponseEntity.ok(Map.of("message", "OTP da duoc gui lai"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        authCookieService.resolveAccessToken(authHeader, httpRequest).ifPresent(token ->
                authService.logout("Bearer " + token));
        authCookieService.clearAuthCookies(httpResponse);
        return ResponseEntity.ok(Map.of("message", "Dang xuat thanh cong"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String ip = resolveClientIp(httpRequest);
        if (rateLimitService.isRateLimited("refresh", ip, 30, Duration.ofMinutes(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        String refreshToken = authCookieService.readRefreshToken(httpRequest)
                .orElse(body != null ? body.get("refreshToken") : null);
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Thieu refresh token"));
        }
        AuthResponse refreshed = authService.refresh(refreshToken);
        authCookieService.writeAuthCookies(httpResponse, refreshed.getToken(), refreshed.getRefreshToken(), true);
        return ResponseEntity.ok(refreshed.withoutTokens());
    }

    @PostMapping("/google-login")
    public ResponseEntity<AuthResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        return authSuccess(authService.googleLogin(request, httpRequest), httpResponse, true);
    }

    @PostMapping("/google-complete-register")
    public ResponseEntity<AuthResponse> googleCompleteRegister(
            @Valid @RequestBody GoogleCompleteRegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        return authSuccess(authService.googleCompleteRegister(request, httpRequest), httpResponse, true);
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email, HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        if (rateLimitService.isRateLimited("check-email", ip, 30, Duration.ofMinutes(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        return ResponseEntity.ok(Map.of("exists", authService.emailExists(email)));
    }

    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username, HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        if (rateLimitService.isRateLimited("check-username", ip, 30, Duration.ofMinutes(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        return ResponseEntity.ok(Map.of("exists", authService.usernameExists(username)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Dat lai mat khau thanh cong"));
    }

    @PostMapping("/request-account-review")
    public ResponseEntity<?> requestAccountReview(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        if (rateLimitService.isRateLimited("account-review", ip, 3, Duration.ofHours(1))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        String reason = body.get("reason");
        if (reason != null && reason.length() > 500) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ly do khong duoc vuot qua 500 ky tu"));
        }
        authService.requestAccountReview(body.get("email"), reason);
        return ResponseEntity.ok(Map.of("message", "Yêu cầu xem xét đã được gửi đến admin"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        if (rateLimitService.isRateLimited("change-password", request.getEmail(), 5, Duration.ofMinutes(15))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Qua nhieu yeu cau. Vui long thu lai sau."));
        }
        authService.changePassword(request);
        return ResponseEntity.ok(Map.of("message", "Doi mat khau thanh cong"));
    }

    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(@AuthenticationPrincipal UserPrincipal principal,
                                         @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Du lieu khong hop le"));
        }
        authService.setPassword(principal.getUserId(), newPassword);
        return ResponseEntity.ok(Map.of("message", "Dat mat khau thanh cong"));
    }

    private ResponseEntity<AuthResponse> authSuccess(AuthResponse auth, HttpServletResponse response, boolean rememberMe) {
        if (auth.getToken() != null && !auth.getToken().isBlank()) {
            authCookieService.writeAuthCookies(response, auth.getToken(), auth.getRefreshToken(), rememberMe);
        }
        return ResponseEntity.ok(auth.withoutTokens());
    }

    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (trustedProxyIps != null && !trustedProxyIps.isBlank()) {
            boolean trusted = Arrays.stream(trustedProxyIps.split(","))
                    .map(String::trim)
                    .anyMatch(remoteAddr::equals);
            if (trusted) {
                String xff = request.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    return xff.split(",")[0].trim();
                }
            }
        }
        return remoteAddr;
    }
}
