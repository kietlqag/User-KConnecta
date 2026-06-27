package project.kconnecta.user.backend.feature.interest.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.interest.entity.UserInterestScore;
import project.kconnecta.user.backend.feature.interest.entity.enums.InterestEventType;
import project.kconnecta.user.backend.feature.interest.repository.PostTopicRepository;
import project.kconnecta.user.backend.feature.interest.repository.UserInterestScoreRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserInterestService {

    private static final int MAX_TOPICS_PER_USER = 15;
    private static final double MAX_SCORE = 100.0;
    private static final double DECAY_PER_DAY = 0.9;

    private final UserInterestScoreRepository userInterestScoreRepository;
    private final PostTopicRepository postTopicRepository;
    private final UserRepository userRepository;

    @Transactional
    public void recordInteraction(UUID userId, UUID postId, InterestEventType eventType) {
        if (userId == null || postId == null || eventType == null) {
            return;
        }
        List<String> topics = postTopicRepository.findByPostId(postId).stream()
                .map(pt -> pt.getTopic().toLowerCase())
                .distinct()
                .toList();
        if (topics.isEmpty()) {
            return;
        }
        User user = userRepository.getReferenceById(userId);
        double delta = eventType.weight();
        for (String topic : topics) {
            upsertScore(user, topic, delta);
        }
        pruneExcessTopics(userId);
    }

    @Transactional(readOnly = true)
    public List<UserInterestScore> getTopInterests(UUID userId, int limit) {
        return userInterestScoreRepository.findByUserIdOrderByScoreDesc(userId).stream()
                .limit(limit)
                .toList();
    }

    private void upsertScore(User user, String topic, double delta) {
        UserInterestScore score = userInterestScoreRepository
                .findByUserIdAndTopicIgnoreCase(user.getId(), topic)
                .orElseGet(() -> UserInterestScore.builder()
                        .user(user)
                        .topic(topic.toLowerCase())
                        .score(0)
                        .updatedAt(LocalDateTime.now())
                        .build());

        applyDecay(score);
        score.setScore(Math.min(MAX_SCORE, score.getScore() + delta));
        score.setUpdatedAt(LocalDateTime.now());
        userInterestScoreRepository.save(score);
    }

    private void applyDecay(UserInterestScore score) {
        if (score.getUpdatedAt() == null) {
            return;
        }
        long days = ChronoUnit.DAYS.between(score.getUpdatedAt(), LocalDateTime.now());
        if (days > 0) {
            score.setScore(score.getScore() * Math.pow(DECAY_PER_DAY, days));
        }
    }

    private void pruneExcessTopics(UUID userId) {
        long count = userInterestScoreRepository.countByUserId(userId);
        if (count <= MAX_TOPICS_PER_USER) {
            return;
        }
        List<UserInterestScore> lowest = userInterestScoreRepository.findByUserIdOrderByScoreAsc(userId);
        int toRemove = (int) (count - MAX_TOPICS_PER_USER);
        for (int i = 0; i < toRemove && i < lowest.size(); i++) {
            userInterestScoreRepository.delete(lowest.get(i));
        }
    }
}
