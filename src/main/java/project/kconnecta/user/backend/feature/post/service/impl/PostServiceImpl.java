package project.kconnecta.user.backend.feature.post.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;
import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostMediaRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostMediaResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionCountResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionDetailsResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionUserResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;
import project.kconnecta.user.backend.feature.post.entity.*;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;
import project.kconnecta.user.backend.feature.post.repository.*;
import project.kconnecta.user.backend.feature.post.service.PostService;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PostServiceImpl implements PostService {
    private static final double FRESHNESS_WEIGHT = 0.60;
    private static final double ENGAGEMENT_WEIGHT = 0.40;
    private static final double COMMENT_WEIGHT = 2.0;
    private static final double SHARE_WEIGHT = 2.0;
    private static final double FRESHNESS_DECAY_HOURS = 6.0;
    private static final double MAX_ENGAGEMENT_FOR_NORMALIZATION = 80.0;

    private final PostRepository postRepository;
    private final PostMediaRepository postMediaRepository;
    private final PostAudienceExclusionRepository postAudienceExclusionRepository;
    private final PostMentionRepository postMentionRepository;
    private final PostReactionRepository postReactionRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostShareRepository postShareRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final CloudinaryService cloudinaryService;

    @Override
    public PostResponse createPost(CreatePostRequest request) {
        User author = getUser(request.getAuthorId(), "Author not found");
        List<CreatePostMediaRequest> mediaRequests = request.getMedia() == null ? Collections.emptyList() : request.getMedia();

        if ((request.getContent() == null || request.getContent().isBlank()) && mediaRequests.isEmpty()) {
            throw new ValidationException("Post must have content or media");
        }

        PostStatus status = request.getStatus() == null ? PostStatus.PUBLISHED : request.getStatus();
        PostPrivacy privacy = request.getPrivacy() == null ? PostPrivacy.PUBLIC : request.getPrivacy();

        if (status == PostStatus.SCHEDULED && request.getScheduledAt() == null) {
            throw new ValidationException("scheduledAt is required when status is SCHEDULED");
        }

        if (privacy != PostPrivacy.FRIENDS_EXCEPT && request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
            throw new ValidationException("excludedUserIds is only supported for FRIENDS_EXCEPT privacy");
        }

        Group group = null;
        if (request.getGroupId() != null) {
            group = groupRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + request.getGroupId()));
        }

        Post post = Post.builder()
                .author(author)
                .group(group)
                .content(trimToNull(request.getContent()))
                .privacy(privacy)
                .status(status)
                .scheduledAt(request.getScheduledAt())
                .publishedAt(status == PostStatus.PUBLISHED ? LocalDateTime.now() : null)
                .locationText(trimToNull(request.getLocationText()))
                .backgroundStyle(trimToNull(request.getBackgroundStyle()))
                .imageUrl(trimToNull(request.getImageUrl()) != null ? request.getImageUrl().trim() : 
                        (mediaRequests.isEmpty() ? null : mediaRequests.get(0).getFileUrl().trim()))
                .promoted(Boolean.TRUE.equals(request.getPromoted()))
                .build();

        attachMedia(post, mediaRequests);
        attachExcludedUsers(post, request.getExcludedUserIds());
        attachTaggedUsers(post, request.getTaggedUserIds());

        return mapToResponse(postRepository.save(post), request.getAuthorId());
    }

    @Override
    public String uploadPostImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Image file is required");
        }
        return cloudinaryService.uploadPostImage(file);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getAllPosts(UUID currentUserId) {
        List<Post> posts = postRepository.findHomeFeedPostsOrderByCreatedAtDesc().stream()
                .filter(p -> p.getGroup() == null || p.getGroup().getPrivacy() == GroupPrivacy.PUBLIC)
                .toList();
        return processPostsBulk(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getPostsByUserId(UUID authorId, UUID currentUserId) {
        List<Post> posts = postRepository.findByAuthorId(authorId);
        return processPostsBulk(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getPostsByGroupId(UUID groupId, UUID currentUserId) {
        List<Post> posts = postRepository.findByGroupId(groupId).stream()
                .filter(p -> p.getGroup() != null && p.getGroup().getId().equals(groupId))
                .toList();
        return processPostsBulk(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getGroupFeedPosts(UUID currentUserId) {
        if (currentUserId == null) return Collections.emptyList();
        List<Post> posts = postRepository.findGroupFeedPostsByUserId(currentUserId);
        return processPostsBulk(posts, currentUserId);
    }

    private List<PostResponse> processPostsBulk(List<Post> posts, UUID currentUserId) {
        if (posts.isEmpty()) return Collections.emptyList();

        List<UUID> postIds = posts.stream().map(Post::getId).toList();

        Map<UUID, Map<ReactionType, Long>> reactionCountsMap = postReactionRepository.findReactionCountsByPostIds(postIds).stream()
                .collect(Collectors.groupingBy(
                        PostReactionRepository.PostReactionCountProjection::getPostId,
                        Collectors.toMap(
                                PostReactionRepository.PostReactionCountProjection::getReactionType,
                                PostReactionRepository.PostReactionCountProjection::getCount
                        )
                ));

        Map<UUID, Long> commentCountsMap = postCommentRepository.countByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(PostCommentRepository.CountProjection::getPostId, PostCommentRepository.CountProjection::getCount));

        Map<UUID, Long> shareCountsMap = postShareRepository.countByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(PostShareRepository.CountProjection::getPostId, PostShareRepository.CountProjection::getCount));

        Map<UUID, ReactionType> userReactionsMap = Collections.emptyMap();
        if (currentUserId != null) {
            userReactionsMap = postReactionRepository.findAllByUserIdAndPostIdIn(currentUserId, postIds).stream()
                    .collect(Collectors.toMap(r -> r.getPost().getId(), PostReaction::getReactionType));
        }

        final Map<UUID, Map<ReactionType, Long>> finalReactionCounts = reactionCountsMap;
        final Map<UUID, Long> finalCommentCounts = commentCountsMap;
        final Map<UUID, Long> finalShareCounts = shareCountsMap;
        final Map<UUID, ReactionType> finalUserReactions = userReactionsMap;

        return posts.stream()
                .map(post -> mapToResponseOptimized(post, currentUserId,
                        finalReactionCounts.getOrDefault(post.getId(), Collections.emptyMap()),
                        finalCommentCounts.getOrDefault(post.getId(), 0L),
                        finalShareCounts.getOrDefault(post.getId(), 0L),
                        finalUserReactions.get(post.getId())))
                .sorted(
                        Comparator.comparingDouble(this::calculateFeedScore).reversed()
                                .thenComparing(PostResponse::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                )
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PostResponse getPostById(UUID id, UUID currentUserId) {
        return mapToResponse(getPost(id), currentUserId);
    }

    @Override
    public PostReactionResponse addReaction(UUID postId, AddReactionRequest request) {
        Post post = getPost(postId);
        User user = getUser(request.getUserId(), "Reaction user not found");

        PostReaction reaction = postReactionRepository.findByPostIdAndUserId(postId, request.getUserId())
                .orElseGet(() -> PostReaction.builder().post(post).user(user).build());
        reaction.setReactionType(request.getReactionType());

        PostReaction saved = postReactionRepository.save(reaction);
        return PostReactionResponse.builder()
                .id(saved.getId())
                .postId(saved.getPost().getId())
                .userId(saved.getUser().getId())
                .reactionType(saved.getReactionType())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Override
    public void removeReaction(UUID postId, UUID userId) {
        getPost(postId);
        getUser(userId, "Reaction user not found");
        postReactionRepository.deleteByPostIdAndUserId(postId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public PostReactionDetailsResponse getReactionDetails(UUID postId) {
        Post post = getPost(postId);
        List<PostReaction> reactions = postReactionRepository.findAllByPostIdOrderByCreatedAtDesc(postId);

        var countByType = reactions.stream()
                .collect(Collectors.groupingBy(PostReaction::getReactionType, Collectors.counting()));

        List<PostReactionCountResponse> counts = Arrays.stream(ReactionType.values())
                .map(reactionType -> PostReactionCountResponse.builder()
                        .reactionType(reactionType)
                        .count(countByType.getOrDefault(reactionType, 0L))
                        .build())
                .toList();

        List<PostReactionUserResponse> users = reactions.stream()
                .map(reaction -> PostReactionUserResponse.builder()
                        .userId(reaction.getUser().getId())
                        .username(reaction.getUser().getUsername())
                        .fullName(reaction.getUser().getFullName())
                        .avatarUrl(reaction.getUser().getAvatarUrl())
                        .reactionType(reaction.getReactionType())
                        .reactedAt(reaction.getCreatedAt())
                        .build())
                .toList();

        return PostReactionDetailsResponse.builder()
                .postId(post.getId())
                .totalCount(reactions.size())
                .counts(counts)
                .reactions(users)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostCommentResponse> getComments(UUID postId) {
        getPost(postId);
        return postCommentRepository.findAllByPostIdOrderByCreatedAtAsc(postId)
                .stream()
                .map(comment -> PostCommentResponse.builder()
                        .id(comment.getId())
                        .postId(comment.getPost().getId())
                        .userId(comment.getUser().getId())
                        .username(comment.getUser().getUsername())
                        .userFullName(comment.getUser().getFullName())
                        .userAvatarUrl(comment.getUser().getAvatarUrl())
                        .parentCommentId(comment.getParentComment() == null ? null : comment.getParentComment().getId())
                        .content(comment.getContent())
                        .createdAt(comment.getCreatedAt())
                        .updatedAt(comment.getUpdatedAt())
                        .build())
                .toList();
    }

    @Override
    public PostCommentResponse addComment(UUID postId, CreateCommentRequest request) {
        Post post = getPost(postId);
        User user = getUser(request.getUserId(), "Comment user not found");

        PostComment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = postCommentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found"));
            if (!parentComment.getPost().getId().equals(postId)) {
                throw new ValidationException("Parent comment does not belong to this post");
            }
        }

        PostComment saved = postCommentRepository.save(PostComment.builder()
                .post(post)
                .user(user)
                .parentComment(parentComment)
                .content(request.getContent().trim())
                .build());

        return PostCommentResponse.builder()
                .id(saved.getId())
                .postId(saved.getPost().getId())
                .userId(saved.getUser().getId())
                .username(saved.getUser().getUsername())
                .userFullName(saved.getUser().getFullName())
                .userAvatarUrl(saved.getUser().getAvatarUrl())
                .parentCommentId(saved.getParentComment() == null ? null : saved.getParentComment().getId())
                .content(saved.getContent())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Override
    public PostShareResponse sharePost(UUID postId, SharePostRequest request) {
        Post post = getPost(postId);
        User user = getUser(request.getUserId(), "Share user not found");

        PostShare saved = postShareRepository.save(PostShare.builder()
                .post(post)
                .user(user)
                .sharedContent(trimToNull(request.getSharedContent()))
                .build());

        return PostShareResponse.builder()
                .id(saved.getId())
                .postId(saved.getPost().getId())
                .userId(saved.getUser().getId())
                .userFullName(saved.getUser().getFullName())
                .sharedContent(saved.getSharedContent())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    private void attachMedia(Post post, List<CreatePostMediaRequest> mediaRequests) {
        for (int i = 0; i < mediaRequests.size(); i++) {
            CreatePostMediaRequest mediaRequest = mediaRequests.get(i);
            post.getMedia().add(PostMedia.builder()
                    .post(post)
                    .mediaType(mediaRequest.getMediaType())
                    .fileUrl(mediaRequest.getFileUrl().trim())
                    .thumbnailUrl(trimToNull(mediaRequest.getThumbnailUrl()))
                    .sortOrder(mediaRequest.getSortOrder() == null ? i : mediaRequest.getSortOrder())
                    .build());
        }
    }

    private void attachExcludedUsers(Post post, List<UUID> excludedUserIds) {
        if (excludedUserIds == null) {
            return;
        }
        for (UUID excludedUserId : excludedUserIds.stream().distinct().toList()) {
            post.getAudienceExclusions().add(PostAudienceExclusion.builder()
                    .post(post)
                    .excludedUser(getUser(excludedUserId, "Excluded user not found"))
                    .build());
        }
    }

    private void attachTaggedUsers(Post post, List<UUID> taggedUserIds) {
        if (taggedUserIds == null) {
            return;
        }
        for (UUID taggedUserId : taggedUserIds.stream().distinct().toList()) {
            post.getMentions().add(PostMention.builder()
                    .post(post)
                    .taggedUser(getUser(taggedUserId, "Tagged user not found"))
                    .build());
        }
    }

    private Post getPost(UUID postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found with id: " + postId));
    }

    private User getUser(UUID userId, String message) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(message + ": " + userId));
    }

    private PostResponse mapToResponse(Post post, UUID currentUserId) {
        Map<ReactionType, Long> reactionCounts = buildReactionCountsMap(post.getId());
        ReactionType currentUserReaction = currentUserId == null ? null :
                postReactionRepository.findByPostIdAndUserId(post.getId(), currentUserId)
                        .map(PostReaction::getReactionType)
                        .orElse(null);
        long commentCount = postCommentRepository.countByPostId(post.getId());
        long shareCount = postShareRepository.countByPostId(post.getId());

        return mapToResponseOptimized(post, currentUserId, reactionCounts, commentCount, shareCount, currentUserReaction);
    }

    private PostResponse mapToResponseOptimized(Post post, UUID currentUserId,
                                               Map<ReactionType, Long> reactionCountsMap,
                                               long commentCount,
                                               long shareCount,
                                               ReactionType currentUserReactionType) {
        List<PostMediaResponse> media = post.getMedia()
                .stream()
                .map(item -> PostMediaResponse.builder()
                        .id(item.getId())
                        .mediaType(item.getMediaType())
                        .fileUrl(item.getFileUrl())
                        .thumbnailUrl(item.getThumbnailUrl())
                        .sortOrder(item.getSortOrder())
                        .build())
                .toList();

        List<UUID> excludedUserIds = post.getAudienceExclusions()
                .stream()
                .map(item -> item.getExcludedUser().getId())
                .toList();

        List<UUID> taggedUserIds = post.getMentions()
                .stream()
                .map(item -> item.getTaggedUser().getId())
                .toList();

        List<PostReactionCountResponse> reactionCounts = Arrays.stream(ReactionType.values())
                .map(reactionType -> PostReactionCountResponse.builder()
                        .reactionType(reactionType)
                        .count(reactionCountsMap.getOrDefault(reactionType, 0L))
                        .build())
                .toList();

        long totalReactionCount = reactionCounts.stream()
                .mapToLong(PostReactionCountResponse::getCount)
                .sum();

        return PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthor().getId())
                .groupId(post.getGroup() != null ? post.getGroup().getId() : null)
                .groupName(post.getGroup() != null ? post.getGroup().getName() : null)
                .groupIconUrl(post.getGroup() != null ? post.getGroup().getCoverPhotoUrl() : null)
                .authorUsername(post.getAuthor().getUsername())
                .authorFullName(post.getAuthor().getFullName())
                .authorAvatarUrl(post.getAuthor().getAvatarUrl())
                .content(post.getContent())
                .imageUrl(post.getImageUrl())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .scheduledAt(post.getScheduledAt())
                .publishedAt(post.getPublishedAt())
                .locationText(post.getLocationText())
                .backgroundStyle(post.getBackgroundStyle())
                .promoted(post.isPromoted())
                .reactionCount(totalReactionCount)
                .reactionCounts(reactionCounts)
                .currentUserReactionType(currentUserReactionType)
                .commentCount(commentCount)
                .shareCount(shareCount)
                .media(media)
                .excludedUserIds(excludedUserIds)
                .taggedUserIds(taggedUserIds)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private Map<ReactionType, Long> buildReactionCountsMap(UUID postId) {
        return postReactionRepository.findReactionCountsByPostId(postId).stream()
                .collect(Collectors.toMap(
                        PostReactionRepository.ReactionCountProjection::getReactionType,
                        PostReactionRepository.ReactionCountProjection::getCount
                ));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private double calculateFeedScore(PostResponse post) {
        double freshnessScore = calculateFreshnessScore(post);
        double engagementScore = calculateEngagementScore(post);
        return FRESHNESS_WEIGHT * freshnessScore + ENGAGEMENT_WEIGHT * engagementScore;
    }

    private double calculateFreshnessScore(PostResponse post) {
        LocalDateTime publishedAt = post.getPublishedAt() != null ? post.getPublishedAt() : post.getCreatedAt();
        if (publishedAt == null) {
            return 0.0;
        }

        long hoursAgo = Math.max(0, ChronoUnit.HOURS.between(publishedAt, LocalDateTime.now()));
        return 1.0 / (1.0 + (hoursAgo / FRESHNESS_DECAY_HOURS));
    }

    private double calculateEngagementScore(PostResponse post) {
        double engagementRaw = post.getReactionCount()
                + (post.getCommentCount() * COMMENT_WEIGHT)
                + (post.getShareCount() * SHARE_WEIGHT);

        return Math.min(engagementRaw / MAX_ENGAGEMENT_FOR_NORMALIZATION, 1.0);
    }
}
