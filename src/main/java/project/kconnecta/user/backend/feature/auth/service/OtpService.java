package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
@Transactional
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
        String htmlContent = getOtpEmailTemplate(code);
        mailService.sendMail(email, "Ma xac nhan KConnecta", htmlContent);

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
                .orElseThrow(() -> new ValidationException("Chưa gửi OTP cho email này"));

        OtpType otpType = account.getStatus() == AccountStatus.INACTIVE
                ? OtpType.ACCOUNT_ACTIVATION
                : OtpType.PASSWORD_RESET;

        Otp otp = otpRepository.findTopByAccountEmailAndTypeOrderByCreatedAtDesc(email, otpType)
                .orElseThrow(() -> new ValidationException("Chưa gửi OTP cho email này"));

        if (LocalDateTime.now().isAfter(otp.getExpiresAt())) {
            throw new ValidationException("Mã OTP đã hết hạn");
        }
        if (!otp.getCode().equals(code)) {
            throw new ValidationException("Mã OTP không đúng");
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

    private String getOtpEmailTemplate(String code) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
                    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background-color: #2563eb; color: #ffffff; padding: 40px 20px; text-align: center; }
                    .content { padding: 40px; color: #334155; line-height: 1.6; }
                    .otp-container { background: #f1f5f9; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; border: 2px dashed #cbd5e1; }
                    .otp-code { font-size: 42px; font-weight: 800; color: #1e40af; letter-spacing: 8px; margin: 0; }
                    .footer { background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header"><h1>KConnecta</h1></div>
                    <div class="content">
                        <p>Xin chào,</p>
                        <p>Bạn vừa yêu cầu mã xác thực (OTP) để truy cập hoặc cập nhật tài khoản KConnecta. Vui lòng sử dụng mã dưới đây:</p>
                        <div class="otp-container">
                            <p style="margin-bottom: 10px; color: #64748b; font-size: 14px;">MÃ XÁC THỰC CỦA BẠN</p>
                            <div class="otp-code">""" + code + """
                            </div>
                        </div>
                        <p>Mã này có hiệu lực trong vòng <strong>1 phút</strong>. Tuyệt đối không chia sẻ mã này với bất kỳ ai.</p>
                        <p style="color: #ef4444; font-size: 13px; margin-top: 20px; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                    </div>
                    <div class="footer"><p>&copy; 2026 KConnecta. All rights reserved.</p></div>
                </div>
            </body>
            </html>
            """;
    }
}
