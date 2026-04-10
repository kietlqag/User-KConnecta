package project.kconnecta.user.backend.feature.auth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.common.util.JwtUtil;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.auth.dto.request.ChangePasswordRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.LoginRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.RegisterRequest;
import project.kconnecta.user.backend.feature.auth.dto.response.AuthResponse;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;
import project.kconnecta.user.backend.feature.user.dto.request.ResetPasswordRequest;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final OtpService otpService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;

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
    }

    public AuthResponse register(RegisterRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ValidationException("Email chua duoc gui ma OTP"));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ValidationException("Email chua duoc kich hoat OTP");
        }

        if (userRepository.findByAccountEmail(request.getEmail()).isPresent()) {
            throw new DuplicateResourceException("Email da duoc su dung");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Ten nguoi dung da ton tai");
        }

        account.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        accountRepository.save(account);

        User user = User.builder()
                .account(account)
                .username(request.getUsername())
                .fullName(request.getFullName())
                .gender(request.getGender() == null ? null : request.getGender().trim())
                .dateOfBirth(request.getDateOfBirth())
                .location(request.getLocation())
                .bio(request.getBio())
                .build();

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    public AuthResponse login(LoginRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Email khong ton tai"));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ValidationException("Tai khoan khong kha dung");
        }

        if (account.getPasswordHash() == null) {
            throw new ValidationException("Tai khoan nay dang nhap qua Google, vui long dung nut Dang nhap bang Google");
        }

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new ValidationException("Mat khau khong dung");
        }

        User user = userRepository.findByAccountId(account.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung tuong ung"));

        return toResponse(user);
    }

    public AuthResponse googleLogin(String idToken) {
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

        // Auto-register if not exist
        User user = userRepository.findByAccountEmail(tokenInfo.email())
                .orElseGet(() -> registerGoogleUser(tokenInfo));

        Account account = user.getAccount();
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ValidationException("Tai khoan khong kha dung");
        }

        return toResponse(user);
    }

    private User registerGoogleUser(GoogleTokenInfo tokenInfo) {
        Account account = accountRepository.findByEmail(tokenInfo.email())
                .orElseGet(() -> {
                    Account newAccount = Account.builder()
                            .email(tokenInfo.email())
                            .passwordHash(null)
                            .status(AccountStatus.ACTIVE)
                            .build();
                    return accountRepository.save(newAccount);
                });

        String baseUsername = tokenInfo.email().split("@")[0]
                .replaceAll("[^a-zA-Z0-9_]", "")
                .toLowerCase();
        String username = baseUsername;
        int suffix = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + suffix++;
        }

        String fullName = (tokenInfo.name() != null && !tokenInfo.name().isBlank())
                ? tokenInfo.name()
                : username;

        User user = User.builder()
                .account(account)
                .username(username)
                .fullName(fullName)
                .avatarUrl(tokenInfo.picture())
                .build();

        return userRepository.save(user);
    }

    public boolean emailExists(String email) {
        return userRepository.findByAccountEmail(email).isPresent();
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

        otpService.clear(request.getEmail());
    }

    private GoogleTokenInfo verifyGoogleIdToken(String idToken) {
        try {
            String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodedToken))
                    .GET()
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
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

    public void setPassword(String email, String newPassword) {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Email khong ton tai"));

        if (account.getPasswordHash() != null) {
            throw new ValidationException("Tai khoan da co mat khau, vui long dung tinh nang doi mat khau");
        }

        account.setPasswordHash(passwordEncoder.encode(newPassword));
        accountRepository.save(account);
    }

    public AuthResponse getTestToken(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Username not found: " + username));
        return toResponse(user);
    }

    private AuthResponse toResponse(User user) {
        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return AuthResponse.builder()
                .id(user.getId())
                .email(user.getAccount().getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .hasPassword(user.getAccount().getPasswordHash() != null)
                .token(token)
                .build();
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
