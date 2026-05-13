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
import java.time.Duration;
import java.util.Random;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class OtpService {

    private static final String REDIS_KEY_PREFIX = "otp:";
    private static final long OTP_EXPIRATION_MINUTES = 1;

    private final MailService mailService;
    private final AccountRepository accountRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    @Value("classpath:templates/otp-email.html")
    private Resource otpEmailTemplateResource;

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
