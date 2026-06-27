package project.kconnecta.user.backend.feature.interest.bootstrap;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.interest.service.PostTopicService;

@Component
@RequiredArgsConstructor
public class PostTopicBackfillRunner {

    private final PostTopicService postTopicService;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        postTopicService.backfillMissingTopics();
    }
}
