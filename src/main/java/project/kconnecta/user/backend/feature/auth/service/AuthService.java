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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final OtpService otpService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ValidationException("Email chua gui OTP"));

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
            throw new ValidationException("Tai khoan chua hoan tat dang ky");
        }

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new ValidationException("Mat khau khong dung");
        }

        User user = userRepository.findByAccountId(account.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay nguoi dung tuong ung"));

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
}
