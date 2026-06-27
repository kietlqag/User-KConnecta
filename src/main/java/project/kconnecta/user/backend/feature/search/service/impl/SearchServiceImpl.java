package project.kconnecta.user.backend.feature.search.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.PostMedia;
import project.kconnecta.user.backend.feature.post.entity.enums.MediaType;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.post.repository.PostReactionRepository;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.post.repository.PostSavedRepository;
import project.kconnecta.user.backend.feature.post.repository.PostShareRepository;
import project.kconnecta.user.backend.feature.search.dto.response.SearchGroupDto;
import project.kconnecta.user.backend.feature.search.dto.response.SearchPersonDto;
import project.kconnecta.user.backend.feature.search.dto.response.SearchPostDto;
import project.kconnecta.user.backend.feature.search.dto.response.SearchResultsResponse;
import project.kconnecta.user.backend.feature.search.dto.response.SearchSuggestionResponse;
import project.kconnecta.user.backend.feature.search.redis.RedisSearchIndexer;
import project.kconnecta.user.backend.feature.search.service.SearchService;
import project.kconnecta.user.backend.feature.settings.repository.UserBlockRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import redis.clients.jedis.search.Document;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SearchServiceImpl implements SearchService {

    private final RedisSearchIndexer redisSearch;

    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final FriendshipRepository friendshipRepository;
    private final PostRepository postRepository;
    private final PostReactionRepository postReactionRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostShareRepository postShareRepository;
    private final PostSavedRepository postSavedRepository;
    private final UserBlockRepository userBlockRepository;

    private Set<UUID> blockedUserIds(UUID currentUserId) {
        if (currentUserId == null) {
            return Set.of();
        }
        return new HashSet<>(userBlockRepository.findRelatedUserIds(currentUserId));
    }

    // ── Suggest ───────────────────────────────────────────────────────────────
    // Redis Search is already sub-millisecond — no @Cacheable layer needed.

    @Override
    public List<SearchSuggestionResponse> suggest(String query, UUID currentUserId) {
        Set<UUID> blocked = blockedUserIds(currentUserId);
        List<SearchSuggestionResponse> results = new ArrayList<>();

        try {
            int fetchLimit = Math.min(50, 10 + blocked.size());
            for (Document doc : redisSearch.searchUsers(query, fetchLimit)) {
                String idStr = stripPrefix(doc.getId(), RedisSearchIndexer.USER_PFX);
                if (isBlockedId(idStr, blocked)) continue;
                results.add(SearchSuggestionResponse.builder()
                        .id(idStr)
                        .type("person")
                        .text(str(doc, "fullName"))
                        .avatarUrl(str(doc, "avatarUrl"))
                        .build());
                if (results.size() == 5) break;
            }
            for (Document doc : redisSearch.searchGroups(query, 3)) {
                results.add(SearchSuggestionResponse.builder()
                        .id(stripPrefix(doc.getId(), RedisSearchIndexer.GROUP_PFX))
                        .type("group")
                        .text(str(doc, "name"))
                        .avatarUrl(str(doc, "coverPhotoUrl"))
                        .build());
            }
        } catch (Exception e) {
            log.warn("[Search] Redis Search unavailable for suggest, falling back to DB: {}", e.getMessage());
            return suggestFromDb(query, blocked);
        }

        return results;
    }

    private List<SearchSuggestionResponse> suggestFromDb(String query, Set<UUID> blocked) {
        List<SearchSuggestionResponse> results = new ArrayList<>();
        userRepository.searchByFullNameOrUsername(query, PageRequest.of(0, 20)).stream()
                .filter(u -> !blocked.contains(u.getId()))
                .limit(5)
                .forEach(u -> results.add(SearchSuggestionResponse.builder()
                        .id(u.getId().toString()).type("person")
                        .text(u.getFullName()).avatarUrl(u.getAvatarUrl()).build()));
        groupRepository.searchByName(query, PageRequest.of(0, 3))
                .forEach(g -> results.add(SearchSuggestionResponse.builder()
                        .id(g.getId().toString()).type("group")
                        .text(g.getName()).avatarUrl(g.getCoverPhotoUrl()).build()));
        return results;
    }

    private static boolean isBlockedId(String idStr, Set<UUID> blocked) {
        if (blocked.isEmpty()) return false;
        try {
            return blocked.contains(UUID.fromString(idStr));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    // ── Full search ───────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public SearchResultsResponse search(String query, UUID currentUserId) {
        Set<UUID> myFriendIds = new HashSet<>(
                friendshipRepository.findFriendIdsByUserIdAndStatus(currentUserId, FriendshipStatus.ACCEPTED));
        Set<UUID> blocked = blockedUserIds(currentUserId);

        List<SearchPersonDto> people;
        List<SearchGroupDto> groups;
        List<SearchPostDto> posts;

        try {
            people = searchPeople(query, currentUserId, myFriendIds, blocked);
            groups = searchGroups(query, currentUserId);
            posts  = searchPosts(query, currentUserId, blocked);
        } catch (Exception e) {
            log.warn("[Search] Redis Search unavailable, falling back to DB: {}", e.getMessage());
            return searchFromDb(query, currentUserId, myFriendIds, blocked);
        }

        return SearchResultsResponse.builder()
                .people(people)
                .groups(groups)
                .posts(posts)
                .build();
    }

    // ── People ────────────────────────────────────────────────────────────────

    private List<SearchPersonDto> searchPeople(String query, UUID currentUserId, Set<UUID> myFriendIds,
                                               Set<UUID> blocked) {
        List<Document> docs = redisSearch.searchUsers(query, 11 + blocked.size());
        List<SearchPersonDto> people = new ArrayList<>();

        for (Document doc : docs) {
            String idStr = stripPrefix(doc.getId(), RedisSearchIndexer.USER_PFX);
            UUID uid = UUID.fromString(idStr);
            if (uid.equals(currentUserId)) continue;
            if (blocked.contains(uid)) continue;

            Set<UUID> theirFriendIds = new HashSet<>(
                    friendshipRepository.findFriendIdsByUserIdAndStatus(uid, FriendshipStatus.ACCEPTED));
            theirFriendIds.retainAll(myFriendIds);

            people.add(SearchPersonDto.builder()
                    .id(idStr)
                    .type("person")
                    .name(str(doc, "fullName"))
                    .avatar(str(doc, "avatarUrl"))
                    .bio(str(doc, "bio"))
                    .mutualFriends(theirFriendIds.size())
                    .isFollowing(myFriendIds.contains(uid))
                    .build());

            if (people.size() == 10) break;
        }
        return people;
    }

    // ── Groups ────────────────────────────────────────────────────────────────

    private List<SearchGroupDto> searchGroups(String query, UUID currentUserId) {
        List<Document> docs = redisSearch.searchGroups(query, 10);

        Set<UUID> joinedGroupIds = groupMemberRepository.findAllByUserId(currentUserId)
                .stream().map(gm -> gm.getGroup().getId()).collect(Collectors.toSet());

        List<UUID> groupIds = docs.stream()
                .map(doc -> UUID.fromString(stripPrefix(doc.getId(), RedisSearchIndexer.GROUP_PFX)))
                .toList();

        Map<UUID, Long> memberCountMap = groupIds.isEmpty() ? Map.of() :
                groupMemberRepository.countByGroupIdIn(groupIds).stream()
                        .collect(Collectors.toMap(p -> p.getGroupId(), p -> p.getCount()));

        List<SearchGroupDto> groups = new ArrayList<>();
        for (Document doc : docs) {
            UUID gid = UUID.fromString(stripPrefix(doc.getId(), RedisSearchIndexer.GROUP_PFX));
            groups.add(SearchGroupDto.builder()
                    .id(gid.toString())
                    .type("group")
                    .name(str(doc, "name"))
                    .coverImage(str(doc, "coverPhotoUrl"))
                    .privacy(str(doc, "privacy"))
                    .memberCount(memberCountMap.getOrDefault(gid, 0L).intValue())
                    .isMember(joinedGroupIds.contains(gid))
                    .build());
        }
        return groups;
    }

    // ── Posts ─────────────────────────────────────────────────────────────────

    private List<SearchPostDto> searchPosts(String query, UUID currentUserId, Set<UUID> blocked) {
        List<UUID> postIds = redisSearch.searchPosts(query, 10 + blocked.size()).stream()
                .map(doc -> UUID.fromString(stripPrefix(doc.getId(), RedisSearchIndexer.POST_PFX)))
                .toList();

        if (postIds.isEmpty()) return List.of();

        // Load full Post entities (with author + group JOIN FETCH)
        List<Post> matchedPosts = postRepository.findAllByIdIn(postIds).stream()
                .filter(p -> p.getAuthor() == null || !blocked.contains(p.getAuthor().getId()))
                .limit(10)
                .toList();
        return enrichPosts(matchedPosts, currentUserId);
    }

    // ── DB fallback (used when Redis Search is unavailable) ───────────────────

    private SearchResultsResponse searchFromDb(String query, UUID currentUserId, Set<UUID> myFriendIds,
                                               Set<UUID> blocked) {
        List<SearchPersonDto> people = userRepository
                .searchByFullNameOrUsername(query, PageRequest.of(0, 20 + blocked.size())).stream()
                .filter(u -> !u.getId().equals(currentUserId))
                .filter(u -> !blocked.contains(u.getId()))
                .limit(10)
                .map(u -> {
                    Set<UUID> theirFriendIds = new HashSet<>(
                            friendshipRepository.findFriendIdsByUserIdAndStatus(u.getId(), FriendshipStatus.ACCEPTED));
                    theirFriendIds.retainAll(myFriendIds);
                    return SearchPersonDto.builder()
                            .id(u.getId().toString()).type("person")
                            .name(u.getFullName()).avatar(u.getAvatarUrl())
                            .bio(u.getBio() != null ? u.getBio() : "")
                            .mutualFriends(theirFriendIds.size())
                            .isFollowing(myFriendIds.contains(u.getId()))
                            .build();
                }).toList();

        Set<UUID> joinedGroupIds = groupMemberRepository.findAllByUserId(currentUserId)
                .stream().map(gm -> gm.getGroup().getId()).collect(Collectors.toSet());
        List<Group> matchedGroups = groupRepository.searchByName(query, PageRequest.of(0, 10));
        List<UUID> groupIds = matchedGroups.stream().map(Group::getId).toList();
        Map<UUID, Long> memberCountMap = groupIds.isEmpty() ? Map.of() :
                groupMemberRepository.countByGroupIdIn(groupIds).stream()
                        .collect(Collectors.toMap(p -> p.getGroupId(), p -> p.getCount()));
        List<SearchGroupDto> groups = matchedGroups.stream()
                .map(g -> SearchGroupDto.builder()
                        .id(g.getId().toString()).type("group")
                        .name(g.getName()).coverImage(g.getCoverPhotoUrl())
                        .privacy(g.getPrivacy().name().toLowerCase())
                        .memberCount(memberCountMap.getOrDefault(g.getId(), 0L).intValue())
                        .isMember(joinedGroupIds.contains(g.getId()))
                        .build()).toList();

        List<Post> matchedPosts = postRepository.searchByContent(query, PageRequest.of(0, 10 + blocked.size()))
                .stream()
                .filter(p -> p.getAuthor() == null || !blocked.contains(p.getAuthor().getId()))
                .limit(10)
                .toList();
        List<SearchPostDto> posts = enrichPosts(matchedPosts, currentUserId);

        return SearchResultsResponse.builder().people(people).groups(groups).posts(posts).build();
    }

    // ── Post enrichment (shared by Redis and DB paths) ────────────────────────

    private List<SearchPostDto> enrichPosts(List<Post> matchedPosts, UUID currentUserId) {
        List<UUID> postIds = matchedPosts.stream().map(Post::getId).toList();
        if (postIds.isEmpty()) return List.of();

        Map<UUID, Long> reactionCounts = postReactionRepository.findReactionCountsByPostIds(postIds).stream()
                .collect(Collectors.groupingBy(
                        PostReactionRepository.PostReactionCountProjection::getPostId,
                        Collectors.summingLong(PostReactionRepository.PostReactionCountProjection::getCount)));

        Map<UUID, Long> commentCounts = postCommentRepository.countByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(
                        PostCommentRepository.CountProjection::getPostId,
                        PostCommentRepository.CountProjection::getCount));

        Map<UUID, Long> shareCounts = postShareRepository.countByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(
                        PostShareRepository.CountProjection::getPostId,
                        PostShareRepository.CountProjection::getCount));

        Map<UUID, String> userReactions = postReactionRepository
                .findAllByUserIdAndPostIdIn(currentUserId, postIds).stream()
                .collect(Collectors.toMap(r -> r.getPost().getId(), r -> r.getReactionType().name()));

        Set<UUID> savedPostIds = postSavedRepository.findSavedPostIdsByUserIdAndPostIdIn(currentUserId, postIds);

        return matchedPosts.stream().map(p -> {
            PostMedia firstVideo = p.getMedia().stream()
                    .filter(m -> m.getMediaType() == MediaType.VIDEO).findFirst().orElse(null);
            PostMedia firstImage = p.getMedia().stream()
                    .filter(m -> m.getMediaType() == MediaType.IMAGE).findFirst().orElse(null);

            String rawUrl = p.getImageUrl();
            boolean rawIsVideo = rawUrl != null && (rawUrl.contains("/video/") ||
                    rawUrl.matches("(?i).*\\.(mp4|mov|webm|ogg)(\\?.*)?$"));

            String imageUrl = firstImage != null ? firstImage.getFileUrl() : (!rawIsVideo ? rawUrl : null);
            String videoUrl = firstVideo != null ? firstVideo.getFileUrl() : (rawIsVideo ? rawUrl : null);

            List<SearchPostDto.MediaItem> mediaItems = p.getMedia().stream()
                    .map(m -> SearchPostDto.MediaItem.builder()
                            .type(m.getMediaType().name()).url(m.getFileUrl()).build())
                    .toList();

            LocalDateTime publishedAt = p.getPublishedAt() != null ? p.getPublishedAt() : p.getCreatedAt();

            return SearchPostDto.builder()
                    .id(p.getId().toString()).type("post")
                    .author(SearchPostDto.AuthorDto.builder()
                            .id(p.getAuthor().getId().toString())
                            .name(p.getAuthor().getFullName())
                            .avatar(p.getAuthor().getAvatarUrl())
                            .type(p.getGroup() != null ? "group" : "person")
                            .groupName(p.getGroup() != null ? p.getGroup().getName() : null)
                            .groupIconUrl(p.getGroup() != null ? p.getGroup().getCoverPhotoUrl() : null)
                            .build())
                    .timestamp(formatTimestamp(publishedAt))
                    .publishedAt(publishedAt != null ? publishedAt.toString() : null)
                    .content(p.getContent() != null ? p.getContent() : "")
                    .image(imageUrl).video(videoUrl)
                    .likes(reactionCounts.getOrDefault(p.getId(), 0L))
                    .comments(commentCounts.getOrDefault(p.getId(), 0L))
                    .shares(shareCounts.getOrDefault(p.getId(), 0L))
                    .userReactionType(userReactions.getOrDefault(p.getId(), null))
                    .savedByCurrentUser(savedPostIds.contains(p.getId()))
                    .groupId(p.getGroup() != null ? p.getGroup().getId().toString() : null)
                    .mediaItems(mediaItems)
                    .build();
        }).toList();
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private static String stripPrefix(String docId, String prefix) {
        return docId.startsWith(prefix) ? docId.substring(prefix.length()) : docId;
    }

    private static String str(Document doc, String field) {
        Object v = doc.get(field);
        return v != null ? v.toString() : "";
    }

    private String formatTimestamp(LocalDateTime dt) {
        if (dt == null) return "";
        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(dt, now);
        if (minutes < 1)  return "Vừa xong";
        if (minutes < 60) return minutes + " phút trước";
        long hours = ChronoUnit.HOURS.between(dt, now);
        if (hours < 24)   return hours + " giờ trước";
        long days = ChronoUnit.DAYS.between(dt, now);
        if (days < 7)     return days + " ngày trước";
        return dt.getDayOfMonth() + " tháng " + dt.getMonthValue() + ", " + dt.getYear();
    }
}
