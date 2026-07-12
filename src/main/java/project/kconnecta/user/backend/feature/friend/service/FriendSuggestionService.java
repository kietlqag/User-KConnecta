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

/**
 * Service điều phối thuật toán gợi ý kết bạn.
 * Thực hiện lấy danh sách ứng viên từ bạn chung, cùng trường học, cùng vị trí địa lý,
 * sau đó tính điểm tương hợp và sắp xếp để hiển thị cho người dùng.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendSuggestionService {

    private static final int MAX_SUGGESTIONS = 40;         // Số lượng gợi ý kết bạn tối đa hiển thị
    private static final int PROFILE_CANDIDATE_LIMIT = 60; // Số lượng ứng viên tối đa lấy ra từ hồ sơ để chấm điểm

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserInterestScoreRepository userInterestScoreRepository;
    private final FriendSuggestionScorer friendSuggestionScorer;

    /**
     * Lấy danh sách gợi ý kết bạn đã được chấm điểm tương hợp và sắp xếp giảm dần cho người dùng.
     * 
     * @param userId ID người dùng hiện tại
     * @return Danh sách phản hồi gợi ý kết bạn chứa lý do hiển thị
     */
    public List<FriendResponse> getSuggestions(UUID userId) {
        User currentUser = userRepository.findById(userId).orElse(null);
        if (currentUser == null) {
            return List.of();
        }

        // Bước 1: Xây dựng tập hợp các ID cần loại trừ khỏi gợi ý (Bản thân, Bạn bè hiện tại, Đã gửi yêu cầu, Bị chặn)
        Set<UUID> excluded = buildExcludedIds(userId);
        
        // Bước 2: Tìm và đếm số lượng bạn chung từ những người có kết nối bạn bè với bạn của mình
        Map<UUID, Integer> mutualCountMap = buildMutualFriendCounts(userId, excluded);

        // Bước 3: Tìm thêm các ứng viên dựa trên độ tương đồng hồ sơ (học cùng trường, quê quán, nơi ở hiện tại)
        Set<UUID> candidateIds = new HashSet<>(mutualCountMap.keySet());
        addProfileCandidates(candidateIds, excluded, currentUser);

        // Nếu hoàn toàn không tìm thấy ứng viên tiềm năng nào, chuyển sang chế độ Gợi ý dự phòng (fallback)
        if (candidateIds.isEmpty()) {
            return fallbackSuggestions(excluded, List.of());
        }

        // Bước 4: Tải thông tin chi tiết của tất cả ứng viên
        Map<UUID, User> candidatesById = userRepository.findAllById(candidateIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        // Tải danh sách các chủ đề sở thích của bản thân và của toàn bộ các ứng viên để so khớp
        Map<UUID, Set<String>> interestTopicsByUser = loadInterestTopics(userId, candidateIds);

        // Bước 5: Chạy bộ chấm điểm FriendSuggestionScorer để tính điểm tương hợp và xếp hạng ứng viên
        List<FriendSuggestionScorer.RankedCandidate> ranked = candidateIds.stream()
                .filter(candidatesById::containsKey)
                .map(candidateId -> friendSuggestionScorer.rank(
                        currentUser,
                        candidatesById.get(candidateId),
                        mutualCountMap.getOrDefault(candidateId, 0),
                        interestTopicsByUser.getOrDefault(userId, Set.of()),
                        interestTopicsByUser.getOrDefault(candidateId, Set.of())))
                .sorted((a, b) -> Double.compare(b.score(), a.score())) // Sắp xếp điểm giảm dần
                .limit(MAX_SUGGESTIONS)
                .toList();

        List<FriendResponse> result = ranked.stream()
                .map(entry -> toResponse(candidatesById.get(entry.userId()), entry))
                .toList();

        // Bước 6: Nếu số lượng kết quả chấm điểm vẫn chưa đạt giới hạn gợi ý, nạp thêm các gợi ý dự phòng (random/phổ biến)
        if (result.size() < MAX_SUGGESTIONS) {
            Set<UUID> fullyExcluded = new HashSet<>(excluded);
            result.forEach(response -> fullyExcluded.add(response.getUserId()));
            return fallbackSuggestions(fullyExcluded, result);
        }

        return result;
    }

    /**
     * Tạo danh sách ID bị loại trừ khỏi gợi ý (Tránh gợi ý lại những người đã có quan hệ kết nối).
     */
    private Set<UUID> buildExcludedIds(UUID userId) {
        Set<UUID> excluded = new HashSet<>(
                friendshipRepository.findFriendIdsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED));
        excluded.addAll(friendshipRepository.findAddresseeIdsByRequesterId(userId)); // Đã gửi yêu cầu kết bạn
        excluded.addAll(friendshipRepository.findRequesterIdsByAddresseeId(userId)); // Đã nhận yêu cầu kết bạn
        excluded.addAll(userBlockRepository.findRelatedUserIds(userId));             // Người bị chặn hoặc chặn mình
        excluded.add(userId);                                                       // Bản thân
        return excluded;
    }

    /**
     * Tìm những người là bạn của bạn mình (bạn chung) và đếm số lượng bạn chung.
     */
    private Map<UUID, Integer> buildMutualFriendCounts(UUID userId, Set<UUID> excluded) {
        Set<UUID> myFriendIds = new HashSet<>(
                friendshipRepository.findFriendIdsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED));

        Map<UUID, Integer> mutualCountMap = new HashMap<>();
        if (myFriendIds.isEmpty()) {
            return mutualCountMap;
        }

        // Lấy tất cả quan hệ bạn bè của bạn bè mình
        for (Object[] pair : friendshipRepository.findFriendshipPairsInvolvingUsers(
                new ArrayList<>(myFriendIds),
                FriendshipStatus.ACCEPTED)) {
            UUID requesterId = (UUID) pair[0];
            UUID addresseeId = (UUID) pair[1];
            UUID candidate;
            
            // Xác định ai là ứng viên (người không phải là bạn của mình và cũng không phải mình)
            if (myFriendIds.contains(requesterId) && !myFriendIds.contains(addresseeId)) {
                candidate = addresseeId;
            } else if (myFriendIds.contains(addresseeId) && !myFriendIds.contains(requesterId)) {
                candidate = requesterId;
            } else {
                continue;
            }
            if (!excluded.contains(candidate)) {
                mutualCountMap.merge(candidate, 1, Integer::sum); // Cộng dồn số bạn chung
            }
        }
        return mutualCountMap;
    }

    /**
     * Truy vấn thêm các ứng viên dựa trên Trường học và Địa lý từ Database để đưa vào hàng chờ chấm điểm.
     */
    private void addProfileCandidates(Set<UUID> candidateIds, Set<UUID> excluded, User currentUser) {
        // Tìm người cùng trường
        String school = normalizeText(currentUser.getSchool());
        if (school != null) {
            userRepository.findBySchoolExcluding(school, excluded, PageRequest.of(0, PROFILE_CANDIDATE_LIMIT))
                    .forEach(user -> candidateIds.add(user.getId()));
        }

        // Tìm người cùng quê quán hoặc nơi ở hiện tại
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

    /**
     * Tải danh sách các chủ đề sở thích được lưu trữ của nhóm User.
     */
    private Map<UUID, Set<String>> loadInterestTopics(UUID userId, Set<UUID> candidateIds) {
        List<UUID> userIds = new ArrayList<>(candidateIds.size() + 1);
        userIds.add(userId);
        userIds.addAll(candidateIds);

        Map<UUID, Set<String>> topicsByUser = new HashMap<>();
        for (UserInterestScore score : userInterestScoreRepository.findByUserIds(userIds)) {
            UUID scoreUserId = score.getUser().getId();
            Set<String> topics = topicsByUser.computeIfAbsent(scoreUserId, ignored -> new HashSet<>());
            if (topics.size() >= 15) { // Giới hạn tối đa lấy 15 sở thích hàng đầu của mỗi user để so sánh hiệu năng
                continue;
            }
            topics.add(score.getTopic().toLowerCase(Locale.ROOT));
        }
        return topicsByUser;
    }

    /**
     * Danh sách gợi ý dự phòng (fallback) khi hệ thống không quét đủ ứng viên chất lượng cao.
     * Sẽ lấy danh sách người dùng ngẫu nhiên hệ thống (không trùng với danh sách loại trừ).
     */
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
