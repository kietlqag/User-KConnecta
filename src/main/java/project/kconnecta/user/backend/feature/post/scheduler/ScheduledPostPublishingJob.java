package project.kconnecta.user.backend.feature.post.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.post.service.PostService;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledPostPublishingJob {

    private final PostService postService;

    /** Publishes posts whose scheduledAt has passed (runs every minute). */
    @Scheduled(cron = "0 * * * * *")
    public void publishDueScheduledPosts() {
        int published = postService.publishDueScheduledPosts();
        if (published > 0) {
            log.info("[scheduler] publish scheduled posts: count={}", published);
        }
    }
}
