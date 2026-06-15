package project.kconnecta.user.backend.feature.live.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.live.service.LiveSessionService;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledLiveSessionJob {

    private final LiveSessionService liveSessionService;

    /** Starts scheduled live sessions when scheduledAt has passed. */
    @Scheduled(cron = "0 * * * * *")
    public void activateDueScheduledSessions() {
        int activated = liveSessionService.activateDueScheduledSessions();
        if (activated > 0) {
            log.info("[scheduler] activated scheduled live sessions: count={}", activated);
        }
    }
}
