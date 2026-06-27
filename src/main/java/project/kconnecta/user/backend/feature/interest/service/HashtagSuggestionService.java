package project.kconnecta.user.backend.feature.interest.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.ai.GeminiHashtagSuggestionService;
import project.kconnecta.user.backend.feature.interest.util.HashtagExtractor;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HashtagSuggestionService {

    private final GeminiHashtagSuggestionService geminiHashtagSuggestionService;
    private final UserInterestService userInterestService;

    @Transactional(readOnly = true)
    public List<String> suggest(String content, UUID userId) {
        List<String> existing = HashtagExtractor.extract(content);
        List<String> interests = userId == null
                ? List.of()
                : userInterestService.getTopInterests(userId, 8).stream()
                        .map(score -> score.getTopic().toLowerCase())
                        .distinct()
                        .toList();

        return geminiHashtagSuggestionService.suggest(content, existing, interests);
    }
}
