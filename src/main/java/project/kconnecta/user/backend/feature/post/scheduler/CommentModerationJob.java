package project.kconnecta.user.backend.feature.post.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.post.service.PostService;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommentModerationJob {

    private final PostService postService;

    /** AI-moderates a bounded batch of PENDING comments (runs every minute). */
    @Scheduled(cron = "0 * * * * *")
    public void moderatePendingComments() {
        int resolved = postService.moderatePendingComments();
        if (resolved > 0) {
            log.info("[scheduler] moderate pending comments: count={}", resolved);
        }
    }
}
