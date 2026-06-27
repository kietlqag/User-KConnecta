package project.kconnecta.user.backend.feature.interest.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.interest.entity.PostTopic;
import project.kconnecta.user.backend.feature.interest.repository.PostTopicRepository;
import project.kconnecta.user.backend.feature.interest.util.HashtagExtractor;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostTopicService {

    private final PostTopicRepository postTopicRepository;
    private final PostRepository postRepository;

    @Transactional
    public void syncTopics(UUID postId, String content) {
        postTopicRepository.deleteByPostId(postId);
        List<String> topics = HashtagExtractor.extract(content);
        if (topics.isEmpty()) {
            return;
        }
        Post post = postRepository.getReferenceById(postId);
        for (String topic : topics) {
            postTopicRepository.save(PostTopic.builder()
                    .post(post)
                    .topic(topic)
                    .build());
        }
    }

    @Transactional
    public int backfillMissingTopics() {
        List<Post> published = postRepository.findByStatus(PostStatus.PUBLISHED);
        Set<UUID> withTopics = postTopicRepository.findAllPostIdsWithTopics().stream()
                .collect(Collectors.toSet());
        int count = 0;
        for (Post post : published) {
            if (withTopics.contains(post.getId())) {
                continue;
            }
            List<String> topics = HashtagExtractor.extract(post.getContent());
            if (topics.isEmpty()) {
                continue;
            }
            syncTopics(post.getId(), post.getContent());
            count++;
        }
        if (count > 0) {
            log.info("PostTopic backfill: synced topics for {} posts", count);
        }
        return count;
    }
}
