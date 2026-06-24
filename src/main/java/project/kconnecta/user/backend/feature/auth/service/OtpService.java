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
        OtpSession session = new OtpSession(code, otpType, false);
        try {
            redisTemplate.opsForValue().set(key, session, Duration.ofMinutes(OTP_EXPIRATION_MINUTES));
        } catch (RedisConnectionFailureException ex) {
            log.error("Redis unavailable while creating OTP for {}", email, ex);
            throw new ValidationException("He thong OTP tam thoi gian doan (Redis). Vui long thu lai sau.");
        }

        String htmlContent = getOtpEmailTemplate(code);
        try {
            mailService.sendMail(email, "Mã xác nhận KConnecta", htmlContent);
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
