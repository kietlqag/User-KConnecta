package project.kconnecta.user.backend.feature.friend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendResponse;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.friend.service.support.FriendSuggestionScorer;
import project.kconnecta.user.backend.feature.interest.entity.UserInterestScore;
import project.kconnecta.user.backend.feature.interest.repository.UserInterestScoreRepository;
import project.kconnecta.user.backend.feature.settings.repository.UserBlockRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendSuggestionService {

    private static final int MAX_SUGGESTIONS = 40;
    private static final int PROFILE_CANDIDATE_LIMIT = 60;

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserInterestScoreRepository userInterestScoreRepository;
    private final FriendSuggestionScorer friendSuggestionScorer;

    public List<FriendResponse> getSuggestions(UUID userId) {
        User currentUser = userRepository.findById(userId).orElse(null);
        if (currentUser == null) {
            return List.of();
        }

        Set<UUID> excluded = buildExcludedIds(userId);
        Map<UUID, Integer> mutualCountMap = buildMutualFriendCounts(userId, excluded);

        Set<UUID> candidateIds = new HashSet<>(mutualCountMap.keySet());
        addProfileCandidates(candidateIds, excluded, currentUser);

        if (candidateIds.isEmpty()) {
            return fallbackSuggestions(excluded, List.of());
        }

        Map<UUID, User> candidatesById = userRepository.findAllById(candidateIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        Map<UUID, Set<String>> interestTopicsByUser = loadInterestTopics(userId, candidateIds);

        List<FriendSuggestionScorer.RankedCandidate> ranked = candidateIds.stream()
                .filter(candidatesById::containsKey)
                .map(candidateId -> friendSuggestionScorer.rank(
                        currentUser,
                        candidatesById.get(candidateId),
                        mutualCountMap.getOrDefault(candidateId, 0),
                        interestTopicsByUser.getOrDefault(userId, Set.of()),
                        interestTopicsByUser.getOrDefault(candidateId, Set.of())))
                .sorted((a, b) -> Double.compare(b.score(), a.score()))
                .limit(MAX_SUGGESTIONS)
                .toList();

        List<FriendResponse> result = ranked.stream()
                .map(entry -> toResponse(candidatesById.get(entry.userId()), entry))
                .toList();

        if (result.size() < MAX_SUGGESTIONS) {
            Set<UUID> fullyExcluded = new HashSet<>(excluded);
            result.forEach(response -> fullyExcluded.add(response.getUserId()));
            return fallbackSuggestions(fullyExcluded, result);
        }

        return result;
    }

    private Set<UUID> buildExcludedIds(UUID userId) {
        Set<UUID> excluded = new HashSet<>(
                friendshipRepository.findFriendIdsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED));
        excluded.addAll(friendshipRepository.findAddresseeIdsByRequesterId(userId));
        excluded.addAll(friendshipRepository.findRequesterIdsByAddresseeId(userId));
        excluded.addAll(userBlockRepository.findRelatedUserIds(userId));
        excluded.add(userId);
        return excluded;
    }

    private Map<UUID, Integer> buildMutualFriendCounts(UUID userId, Set<UUID> excluded) {
        Set<UUID> myFriendIds = new HashSet<>(
                friendshipRepository.findFriendIdsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED));

        Map<UUID, Integer> mutualCountMap = new HashMap<>();
        if (myFriendIds.isEmpty()) {
            return mutualCountMap;
        }

        for (Object[] pair : friendshipRepository.findFriendshipPairsInvolvingUsers(
                new ArrayList<>(myFriendIds),
                FriendshipStatus.ACCEPTED)) {
            UUID requesterId = (UUID) pair[0];
            UUID addresseeId = (UUID) pair[1];
            UUID candidate;
            if (myFriendIds.contains(requesterId) && !myFriendIds.contains(addresseeId)) {
                candidate = addresseeId;
            } else if (myFriendIds.contains(addresseeId) && !myFriendIds.contains(requesterId)) {
                candidate = requesterId;
            } else {
                continue;
            }
            if (!excluded.contains(candidate)) {
                mutualCountMap.merge(candidate, 1, Integer::sum);
            }
        }
        return mutualCountMap;
    }

    private void addProfileCandidates(Set<UUID> candidateIds, Set<UUID> excluded, User currentUser) {
        String school = normalizeText(currentUser.getSchool());
        if (school != null) {
            userRepository.findBySchoolExcluding(school, excluded, PageRequest.of(0, PROFILE_CANDIDATE_LIMIT))
                    .forEach(user -> candidateIds.add(user.getId()));
        }

        String hometown = normalizeText(currentUser.getHometown());
        String location = normalizeText(currentUser.getLocation());
        if (hometown != null || location != null) {
            userRepository.findByLocationSignalsExcluding(
                            hometown,
                            location,
                            excluded,
                            PageRequest.of(0, PROFILE_CANDIDATE_LIMIT))
                    .forEach(user -> candidateIds.add(user.getId()));
        }
    }

    private Map<UUID, Set<String>> loadInterestTopics(UUID userId, Set<UUID> candidateIds) {
        List<UUID> userIds = new ArrayList<>(candidateIds.size() + 1);
        userIds.add(userId);
        userIds.addAll(candidateIds);

        Map<UUID, Set<String>> topicsByUser = new HashMap<>();
        for (UserInterestScore score : userInterestScoreRepository.findByUserIds(userIds)) {
            UUID scoreUserId = score.getUser().getId();
            Set<String> topics = topicsByUser.computeIfAbsent(scoreUserId, ignored -> new HashSet<>());
            if (topics.size() >= 15) {
                continue;
            }
            topics.add(score.getTopic().toLowerCase(Locale.ROOT));
        }
        return topicsByUser;
    }

    private List<FriendResponse> fallbackSuggestions(Set<UUID> excluded, List<FriendResponse> existing) {
        List<FriendResponse> result = new ArrayList<>(existing);
        int needed = MAX_SUGGESTIONS - result.size();
        if (needed <= 0) {
            return result;
        }

        userRepository.findSuggestionsExcluding(excluded, PageRequest.of(0, needed))
                .forEach(user -> result.add(FriendResponse.builder()
                        .friendshipId(null)
                        .userId(user.getId())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .avatarUrl(user.getAvatarUrl())
                        .mutualFriends(0)
                        .suggestionReason("Gợi ý cho bạn")
                        .status(null)
                        .createdAt(null)
                        .build()));
        return result;
    }

    private FriendResponse toResponse(User user, FriendSuggestionScorer.RankedCandidate ranked) {
        return FriendResponse.builder()
                .friendshipId(null)
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .mutualFriends(ranked.mutualFriends())
                .suggestionReason(ranked.reason())
                .status(null)
                .createdAt(null)
                .build();
    }

    private static String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
