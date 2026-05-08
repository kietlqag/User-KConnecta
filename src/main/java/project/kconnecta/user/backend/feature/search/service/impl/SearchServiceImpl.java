package project.kconnecta.user.backend.feature.search.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.post.repository.PostReactionRepository;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.post.repository.PostShareRepository;
import project.kconnecta.user.backend.feature.search.dto.response.SearchGroupDto;
import project.kconnecta.user.backend.feature.search.dto.response.SearchPersonDto;
import project.kconnecta.user.backend.feature.search.dto.response.SearchPostDto;
import project.kconnecta.user.backend.feature.search.dto.response.SearchResultsResponse;
import project.kconnecta.user.backend.feature.search.dto.response.SearchSuggestionResponse;
import project.kconnecta.user.backend.feature.search.service.SearchService;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final FriendshipRepository friendshipRepository;
    private final PostRepository postRepository;
    private final PostReactionRepository postReactionRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostShareRepository postShareRepository;

    // ── Suggest (cached 60s in Redis) ──────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "searchSuggest", key = "#query.toLowerCase()")
    public List<SearchSuggestionResponse> suggest(String query) {
        List<SearchSuggestionResponse> results = new java.util.ArrayList<>();

        userRepository.searchByFullName(query, PageRequest.of(0, 5))
                .forEach(u -> results.add(SearchSuggestionResponse.builder()
                        .id(u.getId().toString())
                        .type("person")
                        .text(u.getFullName())
                        .avatarUrl(u.getAvatarUrl())
                        .build()));

        groupRepository.searchByName(query, PageRequest.of(0, 3))
                .forEach(g -> results.add(SearchSuggestionResponse.builder()
                        .id(g.getId().toString())
                        .type("group")
                        .text(g.getName())
                        .avatarUrl(g.getCoverPhotoUrl())
                        .build()));

        return results;
    }

    // ── Full search (not cached — results depend on current user) ──────────────

    @Override
    @Transactional(readOnly = true)
    public SearchResultsResponse search(String query, UUID currentUserId) {
        // Current user's accepted friend IDs — used for isFollowing + mutualFriends
        Set<UUID> myFriendIds = new HashSet<>(
                friendshipRepository.findFriendIdsByUserIdAndStatus(currentUserId, FriendshipStatus.ACCEPTED));

        // ── People ──────────────────────────────────────────────────────────────
        List<SearchPersonDto> people = userRepository
                .searchByFullName(query, PageRequest.of(0, 10))
                .stream()
                .filter(u -> !u.getId().equals(currentUserId))
                .map(u -> {
                    Set<UUID> theirFriendIds = new HashSet<>(
                            friendshipRepository.findFriendIdsByUserIdAndStatus(u.getId(), FriendshipStatus.ACCEPTED));
                    theirFriendIds.retainAll(myFriendIds);
                    return SearchPersonDto.builder()
                            .id(u.getId().toString())
                            .type("person")
                            .name(u.getFullName())
                            .avatar(u.getAvatarUrl())
                            .bio(u.getBio() != null ? u.getBio() : "")
                            .mutualFriends(theirFriendIds.size())
                            .isFollowing(myFriendIds.contains(u.getId()))
                            .build();
                })
                .toList();

        // ── Groups ──────────────────────────────────────────────────────────────
        Set<UUID> joinedGroupIds = groupMemberRepository.findAllByUserId(currentUserId)
                .stream().map(gm -> gm.getGroup().getId()).collect(Collectors.toSet());

        List<Group> matchedGroups = groupRepository.searchByName(query, PageRequest.of(0, 10));
        List<UUID> groupIds = matchedGroups.stream().map(Group::getId).toList();

        Map<UUID, Long> memberCountMap = groupIds.isEmpty() ? Map.of() :
                groupMemberRepository.countByGroupIdIn(groupIds).stream()
                        .collect(Collectors.toMap(
                                p -> p.getGroupId(),
                                p -> p.getCount()));

        List<SearchGroupDto> groups = matchedGroups.stream()
                .map(g -> SearchGroupDto.builder()
                        .id(g.getId().toString())
                        .type("group")
                        .name(g.getName())
                        .coverImage(g.getCoverPhotoUrl())
                        .privacy(g.getPrivacy().name().toLowerCase())
                        .memberCount(memberCountMap.getOrDefault(g.getId(), 0L).intValue())
                        .isMember(joinedGroupIds.contains(g.getId()))
                        .build())
                .toList();

        // ── Posts ───────────────────────────────────────────────────────────────
        List<Post> matchedPosts = postRepository.searchByContent(query, PageRequest.of(0, 10));
        List<UUID> postIds = matchedPosts.stream().map(Post::getId).toList();

        Map<UUID, Long> reactionCounts = postIds.isEmpty() ? Map.of() :
                postReactionRepository.findReactionCountsByPostIds(postIds).stream()
                        .collect(Collectors.groupingBy(
                                PostReactionRepository.PostReactionCountProjection::getPostId,
                                Collectors.summingLong(PostReactionRepository.PostReactionCountProjection::getCount)));

        Map<UUID, Long> commentCounts = postIds.isEmpty() ? Map.of() :
                postCommentRepository.countByPostIdIn(postIds).stream()
                        .collect(Collectors.toMap(
                                PostCommentRepository.CountProjection::getPostId,
                                PostCommentRepository.CountProjection::getCount));

        Map<UUID, Long> shareCounts = postIds.isEmpty() ? Map.of() :
                postShareRepository.countByPostIdIn(postIds).stream()
                        .collect(Collectors.toMap(
                                PostShareRepository.CountProjection::getPostId,
                                PostShareRepository.CountProjection::getCount));

        List<SearchPostDto> posts = matchedPosts.stream()
                .map(p -> SearchPostDto.builder()
                        .id(p.getId().toString())
                        .type("post")
                        .author(SearchPostDto.AuthorDto.builder()
                                .name(p.getAuthor().getFullName())
                                .avatar(p.getAuthor().getAvatarUrl())
                                .type(p.getGroup() != null ? "group" : "person")
                                .build())
                        .timestamp(formatTimestamp(
                                p.getPublishedAt() != null ? p.getPublishedAt() : p.getCreatedAt()))
                        .content(p.getContent() != null ? p.getContent() : "")
                        .image(p.getImageUrl())
                        .likes(reactionCounts.getOrDefault(p.getId(), 0L))
                        .comments(commentCounts.getOrDefault(p.getId(), 0L))
                        .shares(shareCounts.getOrDefault(p.getId(), 0L))
                        .build())
                .toList();

        return SearchResultsResponse.builder()
                .people(people)
                .groups(groups)
                .posts(posts)
                .build();
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
