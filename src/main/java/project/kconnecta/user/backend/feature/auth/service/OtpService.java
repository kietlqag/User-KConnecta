package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.common.enums.OtpType;
import project.kconnecta.user.backend.common.util.MailService;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class OtpService {

    private static final String REDIS_KEY_PREFIX = "otp:";
    private static final long OTP_EXPIRATION_MINUTES = 1;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final MailService mailService;
    private final AccountRepository accountRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    @Value("classpath:templates/otp-email.html")
    private Resource otpEmailTemplateResource;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public void sendOtp(String email) {
        Account account = accountRepository.findByEmail(email).orElse(null);

        OtpType otpType = (account != null && account.getStatus() == AccountStatus.ACTIVE)
                ? OtpType.PASSWORD_RESET
                : OtpType.ACCOUNT_ACTIVATION;

        sendOtp(email, otpType);
    }

    public void sendOtp(String email, OtpType otpType) {
        String code = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        String key = buildKey(email, otpType);
        // Set PASSWORD_RESET token expiration to 15 minutes for user convenience
        long minutes = (otpType == OtpType.PASSWORD_RESET) ? 15 : OTP_EXPIRATION_MINUTES;
        OtpSession session = new OtpSession(code, otpType, false);
        try {
            redisTemplate.opsForValue().set(key, session, Duration.ofMinutes(minutes));
        } catch (RedisConnectionFailureException ex) {
            log.error("Redis unavailable while creating OTP for {}", email, ex);
            throw new ValidationException("He thong OTP tam thoi gian doan (Redis). Vui long thu lai sau.");
        }

        String htmlContent;
        String subject;
        if (otpType == OtpType.PASSWORD_RESET) {
            htmlContent = getResetPasswordEmailTemplate(email, code);
            subject = "Đặt lại mật khẩu tài khoản KConnecta";
        } else {
            htmlContent = getOtpEmailTemplate(code);
            subject = "Mã xác nhận KConnecta";
        }

        try {
            mailService.sendMail(email, subject, htmlContent);
        } catch (RuntimeException ex) {
            redisTemplate.delete(key);
            throw ex;
        }
    }

    public void verifyOtp(String email, String code) {
        Account account = accountRepository.findByEmail(email).orElse(null);

        OtpType otpType = (account != null && account.getStatus() == AccountStatus.ACTIVE)
                ? OtpType.PASSWORD_RESET
                : OtpType.ACCOUNT_ACTIVATION;

        verifyOtp(email, code, otpType);
    }

    public void verifyOtp(String email, String code, OtpType otpType) {
        String key = buildKey(email, otpType);
        OtpSession otp = getValidOtp(key);

        if (!otp.code().equals(code)) {
            throw new ValidationException("Ma OTP khong dung");
        }

        redisTemplate.opsForValue().set(key, otp.markVerified(), Duration.ofMinutes(OTP_EXPIRATION_MINUTES));
    }

    public boolean isVerified(String email, OtpType otpType) {
        String key = buildKey(email, otpType);
        OtpSession otp = (OtpSession) redisTemplate.opsForValue().get(key);
        return otp != null && otp.verified();
    }

    public boolean isActivationVerified(String email) {
        String key = buildKey(email, OtpType.ACCOUNT_ACTIVATION);
        OtpSession otp = (OtpSession) redisTemplate.opsForValue().get(key);
        return otp != null && otp.verified();
    }

    public boolean isVerified(String email) {
        String key = buildKey(email, OtpType.PASSWORD_RESET);
        OtpSession otp = (OtpSession) redisTemplate.opsForValue().get(key);
        return otp != null && otp.verified();
    }

    public void clear(String email) {
        redisTemplate.delete(buildKey(email, OtpType.PASSWORD_RESET));
        redisTemplate.delete(buildKey(email, OtpType.ACCOUNT_ACTIVATION));
        redisTemplate.delete(buildKey(email, OtpType.TWO_FACTOR_LOGIN));
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
        try {
            String template = new String(otpEmailTemplateResource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            return template.replace("{{OTP_CODE}}", code);
        } catch (IOException ex) {
            log.error("Cannot load OTP email template", ex);
            throw new ValidationException("Không thể tải mẫu email OTP.");
        }
    }

    private String getResetPasswordEmailTemplate(String email, String code) {
        String resetUrl = frontendUrl + "/auth/forgot-password?email=" + email + "&code=" + code;
        return "<html><body>" +
               "<h2>Yêu cầu đặt lại mật khẩu KConnecta</h2>" +
               "<p>Chào bạn, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>" +
               "<p>Vui lòng click vào liên kết bên dưới để tạo mật khẩu mới:</p>" +
               "<p><a href=\"" + resetUrl + "\" style=\"display: inline-block; padding: 10px 20px; color: white; background-color: #10b981; text-decoration: none; border-radius: 5px; font-weight: bold;\">Đặt lại mật khẩu</a></p>" +
               "<p>Nếu nút bấm trên không hoạt động, bạn có thể copy link sau dán vào trình duyệt:</p>" +
               "<p>" + resetUrl + "</p>" +
               "<p>Liên kết này có hiệu lực trong vòng 15 phút.</p>" +
               "</body></html>";
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
