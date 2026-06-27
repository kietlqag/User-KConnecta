package project.kconnecta.user.backend.feature.auth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.HttpServletRequest;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.common.enums.OtpType;
import project.kconnecta.user.backend.common.util.DisplayNameValidator;
import project.kconnecta.user.backend.common.util.JwtUtil;
import project.kconnecta.user.backend.config.security.TokenBlacklistService;
import project.kconnecta.user.backend.exception.AccountLockedException;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.InvalidRefreshTokenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;
import project.kconnecta.user.backend.feature.activity.service.ActivityLogService;
import project.kconnecta.user.backend.feature.auth.dto.request.ChangePasswordRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.GoogleCompleteRegisterRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.GoogleLoginRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.LoginRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.RegisterRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.ResendTwoFactorLoginRequest;
import project.kconnecta.user.backend.feature.auth.dto.response.AuthResponse;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;
import project.kconnecta.user.backend.feature.auth.dto.request.VerifyTwoFactorLoginRequest;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import project.kconnecta.user.backend.feature.settings.service.impl.SettingsServiceImpl;
import project.kconnecta.user.backend.feature.user.dto.request.ResetPasswordRequest;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import project.kconnecta.user.backend.integration.AdminReviewNotificationClient;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private static final HttpClient GOOGLE_HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final OtpService otpService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;
    private final ActivityLogService activityLogService;
    private final AdminReviewNotificationClient adminReviewNotificationClient;
    private final SettingsService settingsService;
    private final SettingsServiceImpl settingsServiceImpl;
    private final TwoFactorPendingService twoFactorPendingService;
    private final RefreshTokenService refreshTokenService;
    private final AccountSessionRevocationService accountSessionRevocationService;

    @Value("${google.oauth.client-id:}")
    private String googleClientId;

    public void changePassword(ChangePasswordRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Email khong ton tai"));

        if (!passwordEncoder.matches(request.getOldPassword(), account.getPasswordHash())) {
            throw new ValidationException("Mat khau cu khong dung");
        }

        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);
        userRepository.findByAccountEmail(request.getEmail())
                .ifPresent(u -> {
                    activityLogService.log(u.getId(), u.getUsername(), ActivityLogType.PASSWORD_CHANGED);
                    refreshTokenService.revokeAllForUser(u.getId());
                });
    }

    public AuthResponse register(RegisterRequest request) {
        if (!otpService.isActivationVerified(request.getEmail())) {
            throw new ValidationException("Email chua duoc xac thuc OTP");
        }

        if (accountRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email da duoc su dung");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Ten nguoi dung da ton tai");
        }

        Account account = accountRepository.save(Account.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status(AccountStatus.ACTIVE)
                .build());

        User user = User.builder()
                .account(account)
                .username(request.getUsername())
                .fullName(DisplayNameValidator.requireSafe(request.getFullName()))
                .gender(request.getGender() == null ? null : request.getGender().trim())
                .dateOfBirth(request.getDateOfBirth())
                .location(request.getLocation())
                .bio(request.getBio())
                .build();

        User saved = userRepository.save(user);
        settingsService.createDefaultSettings(saved.getId());
        otpService.clear(request.getEmail());
        activityLogService.log(saved.getId(), saved.getUsername(), ActivityLogType.REGISTER);
        return toResponse(saved);
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Email khong ton tai"));

        if (account.getPasswordHash() == null) {
            throw new ValidationException("Tai khoan nay dang nhap qua Google, vui long dung nut Dang nhap bang Google");
        }

        User user = userRepository.findByAccountId(account.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung tuong ung"));

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.LOGIN_FAILED,
                    "{\"reason\":\"Mat khau khong dung\"}");
            throw new ValidationException("Mat khau khong dung");
        }

        AuthResponse blocked = resolveLockState(account, user,
                "{\"reason\":\"Tai khoan bi khoa khi dang nhap\"}");
        if (blocked != null) {
            return blocked;
        }
        if (account.getStatus() == AccountStatus.DELETED) {
            throw new ValidationException("Tai khoan da bi xoa");
        }
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ValidationException("Tai khoan khong kha dung");
        }

        if (settingsService.isTwoFactorEnabled(user.getId())) {
            String pendingToken = twoFactorPendingService.createPendingLogin(user.getId());
            otpService.sendOtp(account.getEmail(), OtpType.TWO_FACTOR_LOGIN);
            return AuthResponse.builder()
                    .email(account.getEmail())
                    .requiresTwoFactor(true)
                    .twoFactorToken(pendingToken)
                    .build();
        }

        return completeLogin(user, httpRequest);
    }

    public AuthResponse verifyTwoFactorLogin(VerifyTwoFactorLoginRequest request, HttpServletRequest httpRequest) {
        UUID userId = twoFactorPendingService.consumePendingLogin(request.getTwoFactorToken());
        if (userId == null) {
            throw new ValidationException("Phien xac thuc hai lop da het han");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung"));
        Account account = user.getAccount();

        otpService.verifyOtp(account.getEmail(), request.getOtp(), OtpType.TWO_FACTOR_LOGIN);

        AuthResponse blocked = resolveLockState(account, user,
                "{\"reason\":\"Tai khoan bi khoa khi dang nhap\"}");
        if (blocked != null) {
            return blocked;
        }

        return completeLogin(user, httpRequest);
    }

    public void resendTwoFactorLogin(ResendTwoFactorLoginRequest request) {
        UUID userId = twoFactorPendingService.peekPendingLogin(request.getTwoFactorToken());
        if (userId == null) {
            throw new ValidationException("Phien xac thuc hai lop da het han");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung"));
        Account account = user.getAccount();

        twoFactorPendingService.refreshPendingLogin(request.getTwoFactorToken(), userId);
        otpService.sendOtp(account.getEmail(), OtpType.TWO_FACTOR_LOGIN);
    }

    private AuthResponse completeLogin(User user, HttpServletRequest httpRequest) {
        settingsService.createDefaultSettings(user.getId());
        UUID sessionId = settingsServiceImpl.createLoginSession(user.getId(), httpRequest);
        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.LOGIN);
        return toResponse(user, sessionId);
    }

    public void logout(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return;
        }
        String token = authHeader.substring(7);
        try {
            if (jwtUtil.isTokenValid(token)) {
                UUID userId = jwtUtil.extractUserId(token);
                String username = jwtUtil.extractUsername(token);
                activityLogService.log(userId, username, ActivityLogType.LOGOUT);
                UUID sid = jwtUtil.extractSessionId(token);
                if (sid != null) {
                    refreshTokenService.revoke(sid);
                }
            }
        } catch (Exception ignored) {
            // malformed or expired JWT — still blacklist
        }
        tokenBlacklistService.blacklistToken(token);
    }

    /** Xoay refresh token → cấp access token mới + refresh token mới. */
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshTokenService.RotationResult r = refreshTokenService.rotate(rawRefreshToken);
        User user = userRepository.findById(r.userId())
                .orElseThrow(() -> new InvalidRefreshTokenException("Nguoi dung khong ton tai"));
        Account account = user.getAccount();

        AuthResponse blocked = resolveLockState(account, user,
                "{\"reason\":\"Tai khoan bi khoa khi lam moi phien\"}");
        if (blocked != null) {
            accountSessionRevocationService.revokeAllForUser(user.getId());
            throw new AccountLockedException(user, account);
        }
        if (account.getStatus() == AccountStatus.DELETED
                || account.getStatus() != AccountStatus.ACTIVE) {
            accountSessionRevocationService.revokeAllForUser(user.getId());
            throw new InvalidRefreshTokenException("Tai khoan khong kha dung");
        }

        String access = jwtUtil.generateToken(user.getId(), user.getUsername(), r.sid());
        return AuthResponse.builder()
                .token(access)
                .refreshToken(r.newRefreshToken())
                .build();
    }

    public AuthResponse googleLogin(GoogleLoginRequest request, HttpServletRequest httpRequest) {
        GoogleTokenInfo tokenInfo = resolveGoogleTokenInfo(request.getIdToken(), request.getAccessToken());

        User user = userRepository.findByAccountEmail(tokenInfo.email()).orElse(null);
        if (user == null) {
            ensureGoogleAccountExists(tokenInfo);
            return AuthResponse.builder()
                    .email(tokenInfo.email())
                    .fullName(tokenInfo.name())
                    .hasPassword(false)
                    .requiresProfileSetup(true)
                    .build();
        }

        Account account = user.getAccount();
        AuthResponse blocked = resolveLockState(account, user,
                "{\"reason\":\"Tai khoan bi khoa khi dang nhap Google\"}");
        if (blocked != null) {
            return blocked;
        }
        if (account.getStatus() == AccountStatus.DELETED) {
            throw new ValidationException("Tai khoan da bi xoa");
        }
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ValidationException("Tai khoan khong kha dung");
        }

        if (settingsService.isTwoFactorEnabled(user.getId())) {
            String pendingToken = twoFactorPendingService.createPendingLogin(user.getId());
            otpService.sendOtp(account.getEmail(), OtpType.TWO_FACTOR_LOGIN);
            return AuthResponse.builder()
                    .email(account.getEmail())
                    .requiresTwoFactor(true)
                    .twoFactorToken(pendingToken)
                    .build();
        }

        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.GOOGLE_LOGIN);
        return completeLogin(user, httpRequest);
    }

    public AuthResponse googleCompleteRegister(GoogleCompleteRegisterRequest request, HttpServletRequest httpRequest) {
        GoogleTokenInfo tokenInfo = resolveGoogleTokenInfo(request.getIdToken(), request.getAccessToken());

        if (userRepository.findByAccountEmail(tokenInfo.email()).isPresent()) {
            throw new DuplicateResourceException("Email da duoc su dung");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Ten nguoi dung da ton tai");
        }

        Account account = ensureGoogleAccountExists(tokenInfo);

        User user = User.builder()
                .account(account)
                .username(request.getUsername())
                .fullName(DisplayNameValidator.requireSafe(request.getFullName()))
                .gender(request.getGender() == null ? null : request.getGender().trim())
                .dateOfBirth(request.getDateOfBirth())
                .location(request.getLocation())
                .bio(request.getBio())
                .avatarUrl(tokenInfo.picture())
                .build();

        User saved = userRepository.save(user);
        settingsService.createDefaultSettings(saved.getId());
        activityLogService.log(saved.getId(), saved.getUsername(), ActivityLogType.GOOGLE_LOGIN);
        return completeLogin(saved, httpRequest);
    }

    private Account ensureGoogleAccountExists(GoogleTokenInfo tokenInfo) {
        return accountRepository.findByEmail(tokenInfo.email())
                .orElseGet(() -> accountRepository.save(Account.builder()
                        .email(tokenInfo.email())
                        .passwordHash(null)
                        .status(AccountStatus.ACTIVE)
                        .build()));
    }

    public boolean emailExists(String email) {
        return userRepository.findByAccountEmail(email).isPresent();
    }

    public boolean usernameExists(String username) {
        return userRepository.existsByUsername(username);
    }

    public void requestAccountReview(String email, String reason) {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Email khong ton tai"));
        if (account.getStatus() != AccountStatus.BLOCKED) {
            throw new ValidationException("Tai khoan nay khong o trang thai bi khoa");
        }

        User user = userRepository.findByAccountId(account.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung tuong ung"));
        String displayReason = reason == null || reason.isBlank()
                ? "Người dùng yêu cầu admin xem xét mở khóa"
                : reason.trim();
        String metadata = "{\"reason\":\"" + escapeJson(displayReason) + "\"}";
        activityLogService.logSync(user.getId(), user.getUsername(), ActivityLogType.ACCOUNT_REVIEW_REQUESTED, metadata);
        adminReviewNotificationClient.notifyAccountReviewRequest(user.getId(), user.getUsername(), displayReason);
    }

    public void resetPassword(ResetPasswordRequest request) {
        if (!otpService.isVerified(request.getEmail())) {
            throw new ValidationException("Email chua duoc xac thuc OTP");
        }

        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Email khong ton tai"));

        if (userRepository.findByAccountId(account.getId()).isEmpty()) {
            throw new ValidationException("Email chua co tai khoan nguoi dung de dat lai mat khau");
        }

        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);
        userRepository.findByAccountId(account.getId())
                .ifPresent(u -> {
                    activityLogService.log(u.getId(), u.getUsername(), ActivityLogType.RESET_PASSWORD);
                    refreshTokenService.revokeAllForUser(u.getId());
                });
        otpService.clear(request.getEmail());
    }

    private GoogleTokenInfo verifyGoogleIdToken(String idToken) {
        try {
            String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodedToken))
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<String> response = GOOGLE_HTTP_CLIENT
                    .send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ValidationException("Khong xac minh duoc Google token");
            }

            return objectMapper.readValue(response.body(), GoogleTokenInfo.class);
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ValidationException("Khong xac minh duoc Google token");
        }
    }

    private GoogleTokenInfo resolveGoogleTokenInfo(String idToken, String accessToken) {
        boolean hasIdToken = idToken != null && !idToken.isBlank();
        boolean hasAccessToken = accessToken != null && !accessToken.isBlank();

        if (hasIdToken && hasAccessToken) {
            throw new ValidationException("Chi gui idToken hoac accessToken");
        }
        if (hasIdToken) {
            return verifyGoogleTokenAndAudience(idToken);
        }
        if (hasAccessToken) {
            return verifyGoogleAccessTokenAndAudience(accessToken);
        }
        throw new ValidationException("Thieu thong tin xac thuc Google");
    }

    private GoogleTokenInfo verifyGoogleAccessTokenAndAudience(String accessToken) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new ValidationException("GOOGLE_CLIENT_ID chua duoc cau hinh o backend");
        }

        try {
            String encodedToken = URLEncoder.encode(accessToken, StandardCharsets.UTF_8);
            HttpRequest tokenRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodedToken))
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<String> tokenResponse = GOOGLE_HTTP_CLIENT
                    .send(tokenRequest, HttpResponse.BodyHandlers.ofString());

            if (tokenResponse.statusCode() != 200) {
                throw new ValidationException("Khong xac minh duoc Google token");
            }

            JsonNode tokenNode = objectMapper.readTree(tokenResponse.body());
            String audience = readGoogleAudience(tokenNode);
            if (!googleClientId.equals(audience)) {
                throw new ValidationException("Google token khong hop le cho ung dung nay");
            }

            String email = readText(tokenNode, "email");
            if (!isEmailVerified(tokenNode)) {
                throw new ValidationException("Email Google chua duoc xac minh");
            }

            HttpRequest userInfoRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<String> userInfoResponse = GOOGLE_HTTP_CLIENT
                    .send(userInfoRequest, HttpResponse.BodyHandlers.ofString());

            if (userInfoResponse.statusCode() != 200) {
                throw new ValidationException("Khong lay duoc thong tin Google");
            }

            JsonNode userNode = objectMapper.readTree(userInfoResponse.body());
            if (email == null || email.isBlank()) {
                email = readText(userNode, "email");
            }
            if (email == null || email.isBlank()) {
                throw new ValidationException("Khong lay duoc email Google");
            }

            return new GoogleTokenInfo(
                    email,
                    true,
                    audience,
                    readText(userNode, "name"),
                    readText(userNode, "picture")
            );
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ValidationException("Khong xac minh duoc Google token");
        }
    }

    private String readGoogleAudience(JsonNode node) {
        String audience = readText(node, "aud");
        if (audience != null && !audience.isBlank()) {
            return audience;
        }
        return readText(node, "azp");
    }

    private String readText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }

    private boolean isEmailVerified(JsonNode node) {
        JsonNode value = node.get("email_verified");
        if (value == null || value.isNull()) {
            return false;
        }
        if (value.isBoolean()) {
            return value.booleanValue();
        }
        return "true".equalsIgnoreCase(value.asText());
    }

    private GoogleTokenInfo verifyGoogleTokenAndAudience(String idToken) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new ValidationException("GOOGLE_CLIENT_ID chua duoc cau hinh o backend");
        }

        GoogleTokenInfo tokenInfo = verifyGoogleIdToken(idToken);

        if (!googleClientId.equals(tokenInfo.audience())) {
            throw new ValidationException("Google token khong hop le cho ung dung nay");
        }
        if (!Boolean.TRUE.equals(tokenInfo.emailVerified())) {
            throw new ValidationException("Email Google chua duoc xac minh");
        }

        return tokenInfo;
    }

    public void setPassword(UUID userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Nguoi dung khong ton tai"));

        Account account = user.getAccount();

        if (account.getPasswordHash() != null) {
            throw new ValidationException("Tai khoan da co mat khau, vui long dung tinh nang doi mat khau");
        }

        account.setPasswordHash(passwordEncoder.encode(newPassword));
        accountRepository.save(account);
    }

    private AuthResponse toResponse(User user) {
        return toResponse(user, null);
    }

    private AuthResponse toResponse(User user, UUID sessionId) {
        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), sessionId);
        String refreshToken = sessionId != null
                ? refreshTokenService.issue(user.getId(), sessionId)
                : null;
        return AuthResponse.builder()
                .id(user.getId())
                .email(user.getAccount().getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .hasPassword(user.getAccount().getPasswordHash() != null)
                .requiresProfileSetup(false)
                .token(token)
                .refreshToken(refreshToken)
                .accountStatus(user.getAccount().getStatus())
                .build();
    }

    /**
     * Decides access for a BLOCKED account. A temporary lock (lockedUntil set) whose time
     * has passed is auto-unlocked here and {@code null} is returned so login can proceed.
     * Returns a blocked {@link AuthResponse} while the lock is still in effect, or
     * {@code null} when the account is not blocked.
     */
    private AuthResponse resolveLockState(Account account, User user, String activityReason) {
        if (account.getStatus() != AccountStatus.BLOCKED) {
            return null;
        }
        LocalDateTime lockedUntil = account.getLockedUntil();
        if (lockedUntil != null && !LocalDateTime.now().isBefore(lockedUntil)) {
            account.setStatus(AccountStatus.ACTIVE);
            account.setLockedUntil(null);
            account.setLockReason(null);
            accountRepository.save(account);
            return null;
        }
        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.ACCOUNT_LOCKED, activityReason);
        return toBlockedResponse(user, account);
    }

    private AuthResponse toBlockedResponse(User user, Account account) {
        String reason = account.getLockReason() != null && !account.getLockReason().isBlank()
                ? account.getLockReason()
                : account.getLockedUntil() != null
                ? "Tài khoản của bạn đang bị khóa tạm thời và sẽ tự mở lại sau thời gian khóa."
                : "Tài khoản của bạn đang bị khóa do bị báo cáo hoặc admin cần xem xét thủ công.";
        return AuthResponse.builder()
                .id(user.getId())
                .email(user.getAccount().getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .hasPassword(user.getAccount().getPasswordHash() != null)
                .requiresProfileSetup(false)
                .accountStatus(AccountStatus.BLOCKED)
                .blockedReason(reason)
                .lockedUntil(account.getLockedUntil())
                .build();
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", " ")
                .replace("\n", " ");
    }

    private record GoogleTokenInfo(
            String email,
            @JsonProperty("email_verified") Boolean emailVerified,
            @JsonProperty("aud") String audience,
            String name,
            String picture
    ) {
    }
}
