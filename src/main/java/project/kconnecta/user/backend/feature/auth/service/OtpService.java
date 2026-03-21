package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.common.util.MailService;
import project.kconnecta.user.backend.exception.ValidationException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final MailService mailService;

    private record OtpEntry(String code, LocalDateTime expiry, boolean verified) {}

    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();

    public void sendOtp(String email) {
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        store.put(email, new OtpEntry(code, LocalDateTime.now().plusMinutes(10), false));
        mailService.sendMail(email, "Mã xác nhận KConnecta",
                "Mã OTP của bạn là: " + code + "\nMã có hiệu lực trong 10 phút.");
    }

    public void verifyOtp(String email, String code) {
        OtpEntry entry = store.get(email);
        if (entry == null) throw new ValidationException("Chưa gửi OTP cho email này");
        if (LocalDateTime.now().isAfter(entry.expiry())) throw new ValidationException("OTP đã hết hạn");
        if (!entry.code().equals(code)) throw new ValidationException("OTP không đúng");
        store.put(email, new OtpEntry(entry.code(), entry.expiry(), true));
    }

    public boolean isVerified(String email) {
        OtpEntry entry = store.get(email);
        return entry != null && entry.verified();
    }

    public void clear(String email) {
        store.remove(email);
    }
}
