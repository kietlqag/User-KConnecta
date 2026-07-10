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
    private static final long OTP_EXPIRATION_MINUTES = 5;
    private static final long OTP_VERIFIED_EXPIRATION_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final MailService mailService;
    private final AccountRepository accountRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    @Value("classpath:templates/otp-email.html")
    private Resource otpEmailTemplateResource;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public void sendOtp(String email) {
        sendOtp(email, false);
    }

    public void sendOtp(String email, boolean isAdminRequest) {
        Account account = accountRepository.findByEmail(email).orElse(null);

        OtpType otpType = (account != null && account.getStatus() == AccountStatus.ACTIVE)
                ? OtpType.PASSWORD_RESET
                : OtpType.ACCOUNT_ACTIVATION;

        sendOtp(email, otpType, isAdminRequest);
    }

    public void sendOtp(String email, OtpType otpType) {
        sendOtp(email, otpType, false);
    }

    public void sendOtp(String email, OtpType otpType, boolean isAdminRequest) {
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
            if (isAdminRequest) {
                htmlContent = getResetPasswordLinkOnlyEmailTemplate(email, code);
                subject = "Đặt lại mật khẩu tài khoản KConnecta (Quản trị viên yêu cầu)";
            } else {
                htmlContent = getResetPasswordEmailTemplate(email, code);
                subject = "Đặt lại mật khẩu tài khoản KConnecta";
            }
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

        redisTemplate.opsForValue().set(key, otp.markVerified(), Duration.ofMinutes(OTP_VERIFIED_EXPIRATION_MINUTES));
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
        return "<!DOCTYPE html>" +
               "<html>" +
               "<head>" +
               "    <meta charset=\"UTF-8\">" +
               "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
               "    <title>KConnecta Reset Password</title>" +
               "    <style>" +
               "        body {" +
               "            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;" +
               "            margin: 0;" +
               "            padding: 0;" +
               "            background-color: #f6f9fc;" +
               "        }" +
               "        .container {" +
               "            max-width: 600px;" +
               "            margin: 40px auto;" +
               "            background: #ffffff;" +
               "            border-radius: 12px;" +
               "            overflow: hidden;" +
               "            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" +
               "        }" +
               "        .header {" +
               "            background-color: #10b981;" +
               "            color: #ffffff;" +
               "            padding: 40px 20px;" +
               "            text-align: center;" +
               "        }" +
               "        .header h1 {" +
               "            margin: 0;" +
               "            font-size: 28px;" +
               "            letter-spacing: 1px;" +
               "        }" +
               "        .content {" +
               "            padding: 40px;" +
               "            color: #334155;" +
               "            line-height: 1.6;" +
               "        }" +
               "        .otp-container {" +
               "            background: #f1f5f9;" +
               "            border-radius: 8px;" +
               "            padding: 30px;" +
               "            text-align: center;" +
               "            margin: 30px 0;" +
               "            border: 2px dashed #cbd5e1;" +
               "        }" +
               "        .otp-code {" +
               "            font-size: 42px;" +
               "            font-weight: 800;" +
               "            color: #059669;" +
               "            letter-spacing: 8px;" +
               "            margin: 0;" +
               "        }" +
               "        .btn-container {" +
               "            text-align: center;" +
               "            margin: 25px 0;" +
               "        }" +
               "        .btn-reset {" +
               "            display: inline-block;" +
               "            padding: 12px 24px;" +
               "            color: white !important;" +
               "            background-color: #10b981;" +
               "            text-decoration: none;" +
               "            border-radius: 6px;" +
               "            font-weight: bold;" +
               "            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);" +
               "        }" +
               "        .footer {" +
               "            background-color: #f8fafc;" +
               "            color: #64748b;" +
               "            padding: 20px;" +
               "            text-align: center;" +
               "            font-size: 14px;" +
               "        }" +
               "        .warning {" +
               "            color: #ef4444;" +
               "            font-size: 13px;" +
               "            margin-top: 20px;" +
               "            text-align: center;" +
               "        }" +
               "        .link-text {" +
               "            word-break: break-all;" +
               "            color: #10b981;" +
               "            text-decoration: none;" +
               "        }" +
               "    </style>" +
               "</head>" +
               "<body>" +
               "    <div class=\"container\">" +
               "        <div class=\"header\">" +
               "            <h1>KConnecta</h1>" +
               "        </div>" +
               "        <div class=\"content\">" +
               "            <p>Xin chào,</p>" +
               "            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản KConnecta của bạn. Vui lòng sử dụng mã xác thực (OTP) dưới đây:</p>" +
               "            <div class=\"otp-container\">" +
               "                <p style=\"margin-bottom: 10px; color: #64748b; font-size: 14px;\">MÃ OTP ĐẶT LẠI MẬT KHẨU</p>" +
               "                <div class=\"otp-code\">" + code + "</div>" +
               "            </div>" +
               "            <p>Hoặc bạn có thể click trực tiếp vào nút dưới đây để đặt lại mật khẩu nhanh:</p>" +
               "            <div class=\"btn-container\">" +
               "                <a href=\"" + resetUrl + "\" class=\"btn-reset\">Đặt lại mật khẩu</a>" +
               "            </div>" +
               "            <p style=\"font-size: 13px; color: #64748b;\">Nếu nút bấm trên không hoạt động, bạn có thể copy liên kết sau dán vào trình duyệt:</p>" +
               "            <p style=\"font-size: 13px; margin-top: -10px;\"><a href=\"" + resetUrl + "\" class=\"link-text\">" + resetUrl + "</a></p>" +
               "            <p>Mã OTP và liên kết này có hiệu lực trong vòng <strong>15 phút</strong>. Tuyệt đối không chia sẻ mã này với bất kỳ ai.</p>" +
               "            <p class=\"warning\">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ nếu thấy nghi ngờ.</p>" +
               "        </div>" +
               "        <div class=\"footer\">" +
               "            <p>&copy; 2026 KConnecta. All rights reserved.</p>" +
               "        </div>" +
               "    </div>" +
               "</body>" +
               "</html>";
    }

    private String getResetPasswordLinkOnlyEmailTemplate(String email, String code) {
        String resetUrl = frontendUrl + "/auth/forgot-password?email=" + email + "&code=" + code;
        return "<!DOCTYPE html>" +
               "<html>" +
               "<head>" +
               "    <meta charset=\"UTF-8\">" +
               "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
               "    <title>KConnecta Reset Password</title>" +
               "    <style>" +
               "        body {" +
               "            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;" +
               "            margin: 0;" +
               "            padding: 0;" +
               "            background-color: #f6f9fc;" +
               "        }" +
               "        .container {" +
               "            max-width: 600px;" +
               "            margin: 40px auto;" +
               "            background: #ffffff;" +
               "            border-radius: 12px;" +
               "            overflow: hidden;" +
               "            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" +
               "        }" +
               "        .header {" +
               "            background-color: #10b981;" +
               "            color: #ffffff;" +
               "            padding: 40px 20px;" +
               "            text-align: center;" +
               "        }" +
               "        .header h1 {" +
               "            margin: 0;" +
               "            font-size: 28px;" +
               "            letter-spacing: 1px;" +
               "        }" +
               "        .content {" +
               "            padding: 40px;" +
               "            color: #334155;" +
               "            line-height: 1.6;" +
               "        }" +
               "        .btn-container {" +
               "            text-align: center;" +
               "            margin: 30px 0;" +
               "        }" +
               "        .btn-reset {" +
               "            display: inline-block;" +
               "            padding: 12px 24px;" +
               "            color: white !important;" +
               "            background-color: #10b981;" +
               "            text-decoration: none;" +
               "            border-radius: 6px;" +
               "            font-weight: bold;" +
               "            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);" +
               "        }" +
               "        .footer {" +
               "            background-color: #f8fafc;" +
               "            color: #64748b;" +
               "            padding: 20px;" +
               "            text-align: center;" +
               "            font-size: 14px;" +
               "        }" +
               "        .warning {" +
               "            color: #ef4444;" +
               "            font-size: 13px;" +
               "            margin-top: 20px;" +
               "            text-align: center;" +
               "        }" +
               "        .link-text {" +
               "            word-break: break-all;" +
               "            color: #10b981;" +
               "            text-decoration: none;" +
               "        }" +
               "    </style>" +
               "</head>" +
               "<body>" +
               "    <div class=\"container\">" +
               "        <div class=\"header\">" +
               "            <h1>KConnecta</h1>" +
               "        </div>" +
               "        <div class=\"content\">" +
               "            <p>Xin chào,</p>" +
               "            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản KConnecta của bạn từ Quản trị viên.</p>" +
               "            <p>Vui lòng click trực tiếp vào nút dưới đây để tiến hành tạo mật khẩu mới:</p>" +
               "            <div class=\"btn-container\">" +
               "                <a href=\"" + resetUrl + "\" class=\"btn-reset\">Đặt lại mật khẩu</a>" +
               "            </div>" +
               "            <p style=\"font-size: 13px; color: #64748b;\">Nếu nút bấm trên không hoạt động, bạn có thể copy liên kết sau dán vào trình duyệt:</p>" +
               "            <p style=\"font-size: 13px; margin-top: -10px;\"><a href=\"" + resetUrl + "\" class=\"link-text\">" + resetUrl + "</a></p>" +
               "            <p>Liên kết này có hiệu lực trong vòng <strong>15 phút</strong>. Tuyệt đối không chia sẻ liên kết này với bất kỳ ai.</p>" +
               "            <p class=\"warning\">Nếu bạn không thực hiện yêu cầu này hoặc có nghi ngờ, vui lòng liên hệ với bộ phận hỗ trợ.</p>" +
               "        </div>" +
               "        <div class=\"footer\">" +
               "            <p>&copy; 2026 KConnecta. All rights reserved.</p>" +
               "        </div>" +
               "    </div>" +
               "</body>" +
               "</html>";
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
