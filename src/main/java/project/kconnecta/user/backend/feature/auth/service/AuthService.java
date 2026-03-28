package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.auth.dto.request.LoginRequest;
import project.kconnecta.user.backend.feature.auth.dto.request.RegisterRequest;
import project.kconnecta.user.backend.feature.auth.dto.response.AuthResponse;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;
import project.kconnecta.user.backend.feature.user.dto.request.ResetPasswordRequest;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final OtpService otpService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ValidationException("Email chưa được gửi mã OTP"));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ValidationException("Email chưa được kích hoạt OTP");
        }

        if (userRepository.findByAccountEmail(request.getEmail()).isPresent()) {
            throw new DuplicateResourceException("Email đã được sử dụng");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Tên người dùng đã tồn tại");
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
                .orElseThrow(() -> new ResourceNotFoundException("Email không tồn tại"));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new ValidationException("Tài khoản không khả dụng");
        }

        if (account.getPasswordHash() == null) {
            throw new ValidationException("Tài khoản chưa hoàn tất đăng ký");
        }

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new ValidationException("Mật khẩu không đúng");
        }

        User user = userRepository.findByAccountId(account.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng tương ứng"));

        return toResponse(user);
    }

    private AuthResponse toResponse(User user) {
        return AuthResponse.builder()
                .id(user.getId())
                .email(user.getAccount().getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .build();
    }

    public void resetPassword(ResetPasswordRequest request) {
        if (!otpService.isVerified(request.getEmail())) {
            throw new ValidationException("Email chưa được xác thực OTP");
        }

        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Email không tồn tại"));

        if (userRepository.findByAccountId(account.getId()).isEmpty()) {
            throw new ValidationException("Email chưa có tài khoản người dùng để đặt lại mật khẩu");
        }

        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);

        otpService.clear(request.getEmail());
    }
}
