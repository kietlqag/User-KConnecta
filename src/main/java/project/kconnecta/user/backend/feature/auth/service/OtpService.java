package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.common.util.MailService;
import project.kconnecta.user.backend.common.enums.OtpType;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.entity.Otp;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;
import project.kconnecta.user.backend.feature.auth.repository.OtpRepository;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final MailService mailService;
    private final AccountRepository accountRepository;
    private final OtpRepository otpRepository;

    public void sendOtp(String email) {
        Account account = accountRepository.findByEmail(email)
                .orElseGet(() -> accountRepository.save(
                        Account.builder()
                                .email(email)
                                .status(AccountStatus.INACTIVE)
                                .build()
                ));

        OtpType otpType = account.getStatus() == AccountStatus.ACTIVE
                ? OtpType.PASSWORD_RESET
                : OtpType.ACCOUNT_ACTIVATION;

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        mailService.sendMail(email, "Ma xac nhan KConnecta",
                "Ma OTP cua ban la: " + code + "\nMa co hieu luc trong 1 phut.");

        otpRepository.deleteByAccountEmailAndType(email, otpType);
        otpRepository.save(
                Otp.builder()
                        .account(account)
                        .code(code)
                        .type(otpType)
                        .expiresAt(LocalDateTime.now().plusMinutes(1))
                        .build()
        );
    }

    public void verifyOtp(String email, String code) {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ValidationException("Chua gui OTP cho email nay"));

        OtpType otpType = account.getStatus() == AccountStatus.INACTIVE
                ? OtpType.ACCOUNT_ACTIVATION
                : OtpType.PASSWORD_RESET;

        Otp otp = otpRepository.findTopByAccountEmailAndTypeOrderByCreatedAtDesc(email, otpType)
                .orElseThrow(() -> new ValidationException("Chua gui OTP cho email nay"));

        if (LocalDateTime.now().isAfter(otp.getExpiresAt())) {
            throw new ValidationException("OTP da het han");
        }
        if (!otp.getCode().equals(code)) {
            throw new ValidationException("OTP khong dung");
        }

        if (otpType == OtpType.ACCOUNT_ACTIVATION) {
            account.setStatus(AccountStatus.ACTIVE);
            accountRepository.save(account);
            otpRepository.delete(otp);
            return;
        }

        otp.setVerifiedAt(LocalDateTime.now());
        otpRepository.save(otp);
    }

    public boolean isVerified(String email) {
        return otpRepository.findTopByAccountEmailAndTypeOrderByCreatedAtDesc(email, OtpType.PASSWORD_RESET)
                .map(otp -> otp.getVerifiedAt() != null && LocalDateTime.now().isBefore(otp.getExpiresAt()))
                .orElse(false);
    }

    public void clear(String email) {
        otpRepository.deleteByAccountEmail(email);
    }
}
