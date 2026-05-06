package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.common.enums.OtpType;
import project.kconnecta.user.backend.common.util.MailService;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;

import java.time.Duration;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Transactional
public class OtpService {

    private static final String REDIS_KEY_PREFIX = "otp:";
    private static final long OTP_EXPIRATION_MINUTES = 1;

    private final MailService mailService;
    private final AccountRepository accountRepository;
    private final RedisTemplate<String, Object> redisTemplate;

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

        String key = buildKey(email, otpType);
        OtpSession session = new OtpSession(code, otpType, false);
        redisTemplate.opsForValue().set(key, session, Duration.ofMinutes(OTP_EXPIRATION_MINUTES));
    }

    public void verifyOtp(String email, String code) {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ValidationException("Chua gui OTP cho email nay"));

        OtpType otpType = account.getStatus() == AccountStatus.INACTIVE
                ? OtpType.ACCOUNT_ACTIVATION
                : OtpType.PASSWORD_RESET;

        String key = buildKey(email, otpType);
        OtpSession otp = getValidOtp(key);

        if (!otp.code().equals(code)) {
            throw new ValidationException("Ma OTP khong dung");
        }

        if (otpType == OtpType.ACCOUNT_ACTIVATION) {
            account.setStatus(AccountStatus.ACTIVE);
            accountRepository.save(account);
            redisTemplate.delete(key);
            return;
        }

        redisTemplate.opsForValue().set(key, otp.markVerified(), Duration.ofMinutes(OTP_EXPIRATION_MINUTES));
    }

    public boolean isVerified(String email) {
        String key = buildKey(email, OtpType.PASSWORD_RESET);
        OtpSession otp = (OtpSession) redisTemplate.opsForValue().get(key);
        return otp != null && otp.verified();
    }

    public void clear(String email) {
        redisTemplate.delete(buildKey(email, OtpType.PASSWORD_RESET));
        redisTemplate.delete(buildKey(email, OtpType.ACCOUNT_ACTIVATION));
    }

    private OtpSession getValidOtp(String key) {
        OtpSession otp = (OtpSession) redisTemplate.opsForValue().get(key);
        if (otp == null) {
            throw new ValidationException("Ma OTP da het han hoac chua duoc gui");
        }
        return otp;
    }

    private String buildKey(String email, OtpType otpType) {
        return REDIS_KEY_PREFIX + email.trim().toLowerCase() + ":" + otpType.name();
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
                        <p>Xin chao,</p>
                        <p>Ban vua yeu cau ma xac thuc (OTP) de truy cap hoac cap nhat tai khoan KConnecta. Vui long su dung ma duoi day:</p>
                        <div class="otp-container">
                            <p style="margin-bottom: 10px; color: #64748b; font-size: 14px;">MA XAC THUC CUA BAN</p>
                            <div class="otp-code">""" + code + """
                            </div>
                        </div>
                        <p>Ma nay co hieu luc trong vong <strong>1 phut</strong>. Tuyet doi khong chia se ma nay voi bat ky ai.</p>
                        <p style="color: #ef4444; font-size: 13px; margin-top: 20px; text-align: center;">Neu ban khong thuc hien yeu cau nay, vui long bo qua email nay.</p>
                    </div>
                    <div class="footer"><p>&copy; 2026 KConnecta. All rights reserved.</p></div>
                </div>
            </body>
            </html>
            """;
    }

    private record OtpSession(
            String code,
            OtpType type,
            boolean verified
    ) {
        private OtpSession markVerified() {
            return new OtpSession(code, type, true);
        }
    }
}
