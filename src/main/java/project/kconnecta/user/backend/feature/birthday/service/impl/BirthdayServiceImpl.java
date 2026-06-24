package project.kconnecta.user.backend.feature.birthday.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.birthday.dto.request.SendBirthdayWishRequest;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayFriendResponse;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayMonthGroupResponse;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayWishResponse;
import project.kconnecta.user.backend.feature.birthday.entity.BirthdayNotificationLog;
import project.kconnecta.user.backend.feature.birthday.entity.BirthdayWish;
import project.kconnecta.user.backend.feature.birthday.repository.BirthdayNotificationLogRepository;
import project.kconnecta.user.backend.feature.birthday.repository.BirthdayWishRepository;
import project.kconnecta.user.backend.feature.birthday.service.BirthdayService;
import project.kconnecta.user.backend.feature.birthday.util.BirthdayDateUtils;
import project.kconnecta.user.backend.feature.friend.entity.Friendship;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BirthdayServiceImpl implements BirthdayService {

    private static final int DEFAULT_WISH_HISTORY_LIMIT = 50;
    private static final int MAX_WISH_HISTORY_LIMIT = 100;

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final BirthdayWishRepository birthdayWishRepository;
    private final BirthdayNotificationLogRepository birthdayNotificationLogRepository;
    private final NotificationEventPublisher notificationEventPublisher;

    @Override
    @Transactional(readOnly = true)
    public List<BirthdayFriendResponse> getTodayBirthdays(UUID userId) {
        return getFriendBirthdays(userId).stream()
                .filter(BirthdayFriendResponse::isToday)
                .sorted(Comparator.comparing(BirthdayFriendResponse::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BirthdayFriendResponse> getUpcomingBirthdays(UUID userId, int days) {
        int windowDays = Math.max(1, Math.min(days, 30));
        return getFriendBirthdays(userId).stream()
                .filter(friend -> !friend.isToday() && friend.getDaysUntil() <= windowDays)
                .sorted(Comparator
                        .comparingInt(BirthdayFriendResponse::getDaysUntil)
                        .thenComparing(BirthdayFriendResponse::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BirthdayMonthGroupResponse> getBirthdaysByMonth(UUID userId) {
        LocalDate today = LocalDate.now();
        int currentMonth = today.getMonthValue();
        int currentDay = today.getDayOfMonth();

        Map<Integer, List<BirthdayFriendResponse>> grouped = new LinkedHashMap<>();
        getFriendBirthdays(userId).stream()
                .filter(friend -> {
                    LocalDate dob = friend.getDateOfBirth();
                    int month = dob.getMonthValue();
                    int day = dob.getDayOfMonth();
                    return month > currentMonth || (month == currentMonth && day > currentDay);
                })
                .sorted(Comparator
                        .comparing((BirthdayFriendResponse f) -> f.getDateOfBirth().getMonthValue())
                        .thenComparing(f -> f.getDateOfBirth().getDayOfMonth())
                        .thenComparing(BirthdayFriendResponse::getFullName, String.CASE_INSENSITIVE_ORDER))
                .forEach(friend -> grouped.computeIfAbsent(
                        friend.getDateOfBirth().getMonthValue(),
                        month -> new ArrayList<>()
                ).add(friend));

        return grouped.entrySet().stream()
                .sorted(Comparator.comparingInt(Map.Entry::getKey))
                .map(entry -> BirthdayMonthGroupResponse.builder()
                        .month(entry.getKey())
                        .monthLabel("Tháng " + entry.getKey())
                        .friends(List.copyOf(entry.getValue()))
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BirthdayFriendResponse> searchFriendBirthdays(UUID userId, String query) {
        String normalizedQuery = normalizeSearchText(query);
        if (normalizedQuery.isBlank()) {
            return getFriendBirthdays(userId);
        }
        return getFriendBirthdays(userId).stream()
                .filter(friend -> normalizeSearchText(friend.getFullName()).contains(normalizedQuery))
                .sorted(Comparator.comparing(BirthdayFriendResponse::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BirthdayFriendResponse> getAllFriendBirthdays(UUID userId) {
        return getFriendBirthdays(userId).stream()
                .sorted(Comparator.comparing(BirthdayFriendResponse::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    public BirthdayWishResponse sendWish(UUID senderId, SendBirthdayWishRequest request) {
        if (senderId.equals(request.getRecipientId())) {
            throw new ValidationException("Không thể gửi lời chúc cho chính mình");
        }

        String message = request.getMessage() == null ? "" : request.getMessage().trim();
        if (message.isBlank()) {
            throw new ValidationException("Lời chúc không được để trống");
        }
        if (message.length() > 500) {
            throw new ValidationException("Lời chúc tối đa 500 ký tự");
        }

        ensureFriends(senderId, request.getRecipientId());

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));
        User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));

        BirthdayWish wish = BirthdayWish.builder()
                .sender(sender)
                .recipient(recipient)
                .message(message)
                .build();
        wish = birthdayWishRepository.save(wish);

        notificationEventPublisher.publish(
                senderId,
                recipient.getId(),
                NotificationType.BIRTHDAY_WISH,
                message,
                wish.getId()
        );

        return toWishResponse(wish);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BirthdayWishResponse> getWishHistory(UUID userId, String direction, int limit) {
        int pageSize = Math.max(1, Math.min(limit > 0 ? limit : DEFAULT_WISH_HISTORY_LIMIT, MAX_WISH_HISTORY_LIMIT));
        PageRequest pageable = PageRequest.of(0, pageSize);

        String normalizedDirection = direction == null ? "all" : direction.trim().toLowerCase(Locale.ROOT);
        return switch (normalizedDirection) {
            case "sent" -> birthdayWishRepository.findSentByUserId(userId, pageable).stream()
                    .map(this::toWishResponse)
                    .toList();
            case "received" -> birthdayWishRepository.findReceivedByUserId(userId, pageable).stream()
                    .map(this::toWishResponse)
                    .toList();
            default -> {
                List<BirthdayWishResponse> combined = new ArrayList<>();
                combined.addAll(birthdayWishRepository.findReceivedByUserId(userId, pageable).stream()
                        .map(this::toWishResponse)
                        .toList());
                combined.addAll(birthdayWishRepository.findSentByUserId(userId, pageable).stream()
                        .map(this::toWishResponse)
                        .toList());
                combined.sort(Comparator.comparing(BirthdayWishResponse::getCreatedAt).reversed());
                yield combined.size() > pageSize ? combined.subList(0, pageSize) : combined;
            }
        };
    }

    @Override
    public int sendDailyFriendBirthdayNotifications() {
        LocalDate today = LocalDate.now();
        List<User> birthdayUsers = userRepository.findUsersWithBirthdayOn(
                today.getMonthValue(),
                today.getDayOfMonth()
        );

        int sentCount = 0;
        for (User birthdayUser : birthdayUsers) {
            List<UUID> friendIds = friendshipRepository.findFriendIdsByUserIdAndStatus(
                    birthdayUser.getId(),
                    FriendshipStatus.ACCEPTED
            );
            for (UUID friendId : friendIds) {
                if (birthdayNotificationLogRepository.existsByRecipientIdAndBirthdayUserIdAndNotificationDate(
                        friendId,
                        birthdayUser.getId(),
                        today
                )) {
                    continue;
                }

                notificationEventPublisher.publish(
                        birthdayUser.getId(),
                        friendId,
                        NotificationType.BIRTHDAY,
                        "có sinh nhật hôm nay",
                        birthdayUser.getId()
                );

                birthdayNotificationLogRepository.save(BirthdayNotificationLog.builder()
                        .recipientId(friendId)
                        .birthdayUserId(birthdayUser.getId())
                        .notificationDate(today)
                        .build());
                sentCount++;
            }
        }

        if (sentCount > 0) {
            log.info("[birthday] sent {} friend birthday notifications for {}", sentCount, today);
        }
        return sentCount;
    }

    private List<BirthdayFriendResponse> getFriendBirthdays(UUID userId) {
        return friendshipRepository.findAllByUserIdAndStatusWithUsers(userId, FriendshipStatus.ACCEPTED)
                .stream()
                .map(friendship -> mapFriendBirthday(friendship, userId))
                .filter(Objects::nonNull)
                .toList();
    }

    private BirthdayFriendResponse mapFriendBirthday(Friendship friendship, UUID viewerId) {
        User friend = friendship.getRequester().getId().equals(viewerId)
                ? friendship.getAddressee()
                : friendship.getRequester();
        if (friend.getDateOfBirth() == null) {
            return null;
        }

        LocalDate dob = friend.getDateOfBirth();
        return BirthdayFriendResponse.builder()
                .friendshipId(friendship.getId())
                .userId(friend.getId())
                .fullName(friend.getFullName())
                .avatarUrl(friend.getAvatarUrl())
                .dateOfBirth(dob)
                .age(BirthdayDateUtils.calculateAge(dob))
                .today(BirthdayDateUtils.isBirthdayToday(dob))
                .daysUntil(BirthdayDateUtils.isBirthdayToday(dob) ? 0 : BirthdayDateUtils.daysUntilNextBirthday(dob))
                .build();
    }

    private void ensureFriends(UUID userId, UUID otherUserId) {
        friendshipRepository.findBetweenUsers(userId, otherUserId)
                .filter(friendship -> friendship.getStatus() == FriendshipStatus.ACCEPTED)
                .orElseThrow(() -> new ForbiddenException("Chỉ có thể gửi lời chúc cho bạn bè"));
    }

    private BirthdayWishResponse toWishResponse(BirthdayWish wish) {
        return BirthdayWishResponse.builder()
                .id(wish.getId())
                .senderId(wish.getSender().getId())
                .senderName(wish.getSender().getFullName())
                .senderAvatarUrl(wish.getSender().getAvatarUrl())
                .recipientId(wish.getRecipient().getId())
                .recipientName(wish.getRecipient().getFullName())
                .recipientAvatarUrl(wish.getRecipient().getAvatarUrl())
                .message(wish.getMessage())
                .createdAt(wish.getCreatedAt())
                .build();
    }

    private String normalizeSearchText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replace('Đ', 'd');
        return normalized.trim();
    }
}
