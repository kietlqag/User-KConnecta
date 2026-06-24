package project.kconnecta.user.backend.feature.birthday.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.birthday.service.BirthdayService;

@Slf4j
@Component
@RequiredArgsConstructor
public class BirthdayNotificationJob {

    private final BirthdayService birthdayService;

    /** Gửi thông báo sinh nhật bạn bè mỗi ngày lúc 08:00. */
    @Scheduled(cron = "0 0 8 * * *")
    public void sendDailyBirthdayNotifications() {
        int sent = birthdayService.sendDailyFriendBirthdayNotifications();
        if (sent > 0) {
            log.info("[scheduler] birthday notifications sent: {}", sent);
        }
    }
}
