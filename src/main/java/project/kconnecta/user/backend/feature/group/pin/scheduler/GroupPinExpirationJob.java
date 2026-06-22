package project.kconnecta.user.backend.feature.group.pin.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.group.pin.service.GroupPinService;

@Slf4j
@Component
@RequiredArgsConstructor
public class GroupPinExpirationJob {

    private final GroupPinService pinService;

    /** Tự bỏ ghim các bài ghim đã hết hạn (chạy mỗi phút). */
    @Scheduled(cron = "0 * * * * *")
    public void sweepExpiredPins() {
        int unpinned = pinService.sweepExpiredPins();
        if (unpinned > 0) {
            log.info("[scheduler] auto-unpin expired pins: count={}", unpinned);
        }
    }
}
