package project.kconnecta.user.backend.common.util;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Objects;

@Service
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendMail(String to, String subject, String body) {
        if (!StringUtils.hasText(fromEmail)) {
            throw new IllegalStateException("MAIL_USERNAME chua duoc cau hinh, khong the gui email.");
        }
        String from = Objects.requireNonNull(fromEmail);
        String recipient = Objects.requireNonNull(to);
        String mailSubject = Objects.requireNonNull(subject);
        String mailBody = Objects.requireNonNull(body);

        try {
            log.info("Sending email via SMTP: from={}, to={}, subject={}", from, recipient, mailSubject);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(from, "KConnecta Support");
            helper.setTo(recipient);
            helper.setSubject(mailSubject);
            helper.setText(mailBody, true);

            mailSender.send(message);
            log.info("Email sent successfully: to={}, subject={}", recipient, mailSubject);
        } catch (MailAuthenticationException ex) {
            log.error("SMTP authentication failed for sender {}", fromEmail, ex);
            throw new RuntimeException("Dang nhap SMTP that bai. Kiem tra MAIL_USERNAME va MAIL_PASSWORD/App Password.", ex);
        } catch (MailSendException ex) {
            log.error("SMTP accepted request but failed while sending email to {}", recipient, ex);
            throw new RuntimeException("SMTP khong gui duoc email den nguoi nhan. Kiem tra dia chi email, spam folder, hoac han muc nha cung cap.", ex);
        } catch (Exception ex) {
            log.error("Unexpected error while sending email to {}", recipient, ex);
            throw new RuntimeException("Khong the gui email OTP qua SMTP. Kiem tra cau hinh MAIL_USERNAME, MAIL_PASSWORD, host, port va ket noi mang.", ex);
        }
    }
}
