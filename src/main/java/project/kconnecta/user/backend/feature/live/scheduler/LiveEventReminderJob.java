package project.kconnecta.user.backend.feature.live.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.live.service.LiveEventSubscriptionService;

@Slf4j
@Component
@RequiredArgsConstructor
public class LiveEventReminderJob {

    private final LiveEventSubscriptionService liveEventSubscriptionService;

    /** Sends reminder notifications before scheduled live events start. */
    @Scheduled(cron = "0 * * * * *")
    public void sendUpcomingReminders() {
        liveEventSubscriptionService.sendUpcomingReminders();
    }
}
