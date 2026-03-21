package project.kconnecta.user.backend.feature.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.common.util.MailService;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestMailController {

    private final MailService mailService;

    @GetMapping("/mail")
    public String testMail() {
        mailService.sendMail(
                "mkhang4444@gmail.com", // gửi cho chính bạn
                "Test Mail 🚀",
                "Nếu bạn đọc được mail này thì OK rồi rồirồirồirồirồirồi!"
        );
        return "Mail sent!";
    }
}
