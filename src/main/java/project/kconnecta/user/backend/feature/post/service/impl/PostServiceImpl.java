package project.kconnecta.user.backend.feature.post.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostMediaRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SavePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.ReportPostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.CheckInSuggestionResponse;
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
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;
import project.kconnecta.user.backend.feature.activity.service.ActivityLogService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.post.entity.PostSaved;
import project.kconnecta.user.backend.feature.post.entity.PostCommentLike;
import project.kconnecta.user.backend.feature.post.repository.*;
import project.kconnecta.user.backend.feature.policy.service.PolicyContentValidator;
import project.kconnecta.user.backend.feature.post.service.PostService;
import project.kconnecta.user.backend.feature.search.redis.RedisSearchIndexer;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import org.springframework.data.redis.core.RedisTemplate;
import project.kconnecta.user.backend.exception.ForbiddenException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PostServiceImpl implements PostService {


    private final PostRepository postRepository;
    private final PostReactionRepository postReactionRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostCommentLikeRepository postCommentLikeRepository;
    private final PostShareRepository postShareRepository;
    private final PostSavedRepository postSavedRepository;
    private final PostReportRepository postReportRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final CloudinaryService cloudinaryService;
    private final NotificationEventPublisher notificationEventPublisher;
    private final ActivityLogService activityLogService;
    private final project.kconnecta.user.backend.integration.AdminPostReportNotificationClient adminPostReportNotificationClient;
    private final PolicyContentValidator policyContentValidator;
    private final RedisSearchIndexer redisSearchIndexer;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public PostResponse createPost(CreatePostRequest request) {
        User author = getUser(request.getAuthorId(), "Author not found");
        List<CreatePostMediaRequest> mediaRequests = request.getMedia() == null ? Collections.emptyList() : request.getMedia();

        if ((request.getContent() == null || request.getContent().isBlank()) && mediaRequests.isEmpty()) {
            throw new ValidationException("Post must have content or media");
        }

        policyContentValidator.validatePost(
                author.getId(),
                request.getContent(),
                mediaRequests.size()
        );

        PostStatus status = request.getStatus() == null ? PostStatus.PUBLISHED : request.getStatus();
        PostPrivacy privacy = request.getPrivacy() == null ? PostPrivacy.PUBLIC : request.getPrivacy();

        if (status == PostStatus.SCHEDULED && request.getScheduledAt() == null) {
            throw new ValidationException("scheduledAt is required when status is SCHEDULED");
        }

        if (status == PostStatus.SCHEDULED) {
            if (!request.getScheduledAt().isAfter(LocalDateTime.now())) {
                throw new ValidationException("scheduledAt must be in the future");
            }
        } else if (request.getScheduledAt() != null && request.getScheduledAt().isAfter(LocalDateTime.now())) {
            status = PostStatus.SCHEDULED;
        }

        log.info("create post: authorId={}, status={}, scheduledAt={}, groupId={}",
                request.getAuthorId(), status, request.getScheduledAt(), request.getGroupId());

        if (privacy != PostPrivacy.FRIENDS_EXCEPT && request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
            throw new ValidationException("excludedUserIds is only supported for FRIENDS_EXCEPT privacy");
        }

        if (privacy != PostPrivacy.SPECIFIC_FRIENDS && request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
            throw new ValidationException("allowedUserIds is only supported for SPECIFIC_FRIENDS privacy");
        }

        Group group = null;
        if (request.getGroupId() != null) {
            group = groupRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + request.getGroupId()));

            boolean isMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), author.getId())
                    .map(gm -> gm.getStatus() == project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED)
                    .orElse(false);

            if (!isMember) {
                throw new ValidationException("Only approved group members can post in this group");
            }

            if (privacy != PostPrivacy.PUBLIC) {
                privacy = PostPrivacy.PUBLIC;
            }
            if (request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
                throw new ValidationException("Audience exclusions are not supported for group posts");
            }
            if (request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
                throw new ValidationException("Audience allowances are not supported for group posts");
            }
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
        attachAllowedUsers(post, request.getAllowedUserIds());
        attachTaggedUsers(post, request.getTaggedUserIds());

        Post saved = postRepository.save(post);
        log.info("create post saved: postId={}, status={}, publishedAt={}",
                saved.getId(), saved.getStatus(), saved.getPublishedAt());

        PostResponse response = mapToResponse(saved, request.getAuthorId());
        if (saved.getStatus() == PostStatus.PUBLISHED) {
            activityLogService.log(author.getId(), author.getUsername(), ActivityLogType.POST_CREATED,
                    "{\"postId\":\"" + response.getId() + "\"}");
        }
        return response;
    }

    @Override
    public int publishDueScheduledPosts() {
        LocalDateTime now = LocalDateTime.now();
        List<Post> due = postRepository.findDueScheduledPosts(now);
        if (due.isEmpty()) {
            return 0;
        }

        int count = 0;
        for (Post post : due) {
            log.info("scheduler publish: postId={}, scheduledAt={}, now={}",
                    post.getId(), post.getScheduledAt(), now);
            post.setStatus(PostStatus.PUBLISHED);
            post.setPublishedAt(now);
            Post saved = postRepository.save(post);
            redisSearchIndexer.indexPost(saved);
            User author = saved.getAuthor();
            activityLogService.log(author.getId(), author.getUsername(), ActivityLogType.POST_CREATED,
                    "{\"postId\":\"" + saved.getId() + "\",\"scheduled\":true}");
            count++;
        }
        return count;
    }

    private static final String UPLOAD_OWNERSHIP_PREFIX = "post:upload:";
    private static final Duration UPLOAD_OWNERSHIP_TTL = Duration.ofHours(2);

    @Override
    public String uploadPostImage(UUID uploaderId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Image file is required");
        }
        String url = cloudinaryService.uploadPostImage(file);
        try {
            redisTemplate.opsForValue().set(
                    UPLOAD_OWNERSHIP_PREFIX + uploaderId + ":" + url, "1", UPLOAD_OWNERSHIP_TTL);
        } catch (Exception ignored) {
            // Non-fatal: ownership tracking best-effort
        }
        return url;
    }

    @Override
    public void deleteMedia(String url, UUID userId) {
        boolean ownsUpload = Boolean.TRUE.equals(
                redisTemplate.hasKey(UPLOAD_OWNERSHIP_PREFIX + userId + ":" + url));
        if (!ownsUpload) {
            throw new ForbiddenException("You do not have permission to delete this media");
        }
        redisTemplate.delete(UPLOAD_OWNERSHIP_PREFIX + userId + ":" + url);
        cloudinaryService.deleteImageByUrl(url);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> getAllPosts(UUID currentUserId, Pageable pageable) {
        Page<Post> postPage = postRepository.findHomeFeedPostsWithScoring(currentUserId, pageable);
        List<Post> diversified = applyAuthorDiversity(postPage.getContent(), 3);
        List<PostResponse> responses = processPostsBulk(diversified, currentUserId);
        return new PageImpl<>(responses, pageable, postPage.getTotalElements());
    }

    private List<Post> applyAuthorDiversity(List<Post> posts, int maxPerAuthor) {
        Map<UUID, Integer> authorCount = new HashMap<>();
        return posts.stream()
                .filter(p -> {
                    UUID authorId = p.getAuthor().getId();
                    int count = authorCount.getOrDefault(authorId, 0);
                    if (count < maxPerAuthor) {
                        authorCount.put(authorId, count + 1);
                        return true;
                    }
                    return false;
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> getWatchPosts(UUID currentUserId, Pageable pageable) {
        Page<Post> postPage = postRepository.findWatchFeedPosts(currentUserId, pageable);
        List<PostResponse> responses = processPostsBulk(postPage.getContent(), currentUserId);
        return new PageImpl<>(responses, pageable, postPage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> getPostsByUserId(UUID authorId, UUID currentUserId, Pageable pageable) {
        Page<Post> postPage = postRepository.findByAuthorIdWithPrivacy(authorId, currentUserId, pageable);
        List<PostResponse> responses = processPostsBulk(postPage.getContent(), currentUserId);
        return new PageImpl<>(responses, pageable, postPage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getPostsByGroupId(UUID groupId, UUID currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        if (group.getPrivacy() == project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy.PRIVATE) {
            boolean isMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                    .map(gm -> gm.getStatus() == project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus.APPROVED)
                    .orElse(false);
            if (!isMember) {
                return java.util.Collections.emptyList();
            }
        }

        List<Post> posts = postRepository.findByGroupId(groupId);
        log.debug("feed query getPostsByGroupId: groupId={}, count={}, statuses=PUBLISHED only",
                groupId, posts.size());
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
        Set<UUID> savedPostIds = Collections.emptySet();
        if (currentUserId != null) {
            userReactionsMap = postReactionRepository.findAllByUserIdAndPostIdIn(currentUserId, postIds).stream()
                    .collect(Collectors.toMap(r -> r.getPost().getId(), PostReaction::getReactionType));
            savedPostIds = postSavedRepository.findSavedPostIdsByUserIdAndPostIdIn(currentUserId, postIds);
        }

        final Map<UUID, Map<ReactionType, Long>> finalReactionCounts = reactionCountsMap;
        final Map<UUID, Long> finalCommentCounts = commentCountsMap;
        final Map<UUID, Long> finalShareCounts = shareCountsMap;
        final Map<UUID, ReactionType> finalUserReactions = userReactionsMap;
        final Set<UUID> finalSavedPostIds = savedPostIds;

        return posts.stream()
                .filter(p -> p.getStatus() == PostStatus.PUBLISHED)
                .map(post -> mapToResponseOptimized(post, currentUserId,
                        finalReactionCounts.getOrDefault(post.getId(), Collections.emptyMap()),
                        finalCommentCounts.getOrDefault(post.getId(), 0L),
                        finalShareCounts.getOrDefault(post.getId(), 0L),
                        finalUserReactions.get(post.getId()),
                        finalSavedPostIds.contains(post.getId())))
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
        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.REACTION_ADDED,
                "{\"postId\":\"" + postId + "\",\"type\":\"" + request.getReactionType() + "\"}");

        // Push LIKE event → Queue → Listener creates notification FIFO
        notificationEventPublisher.publish(
                user.getId(),
                post.getAuthor().getId(),
                NotificationType.LIKE,
                user.getFullName() + " đã thích bài viết của bạn.",
                post.getId()
        );

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

    private PostCommentResponse toCommentResponse(PostComment comment, UUID parentCommentId, UUID currentUserId) {
        boolean deleted = comment.isDeleted();
        return PostCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .userId(deleted ? null : comment.getUser().getId())
                .username(deleted ? null : comment.getUser().getUsername())
                .userFullName(deleted ? null : comment.getUser().getFullName())
                .userAvatarUrl(deleted ? null : comment.getUser().getAvatarUrl())
                .parentCommentId(parentCommentId)
                .isDeleted(deleted)
                .replyCount(postCommentRepository.countByParentCommentId(comment.getId()))
                .likeCount(deleted ? 0 : postCommentLikeRepository.countByCommentId(comment.getId()))
                .isLikedByCurrentUser(!deleted && currentUserId != null && postCommentLikeRepository.existsByCommentIdAndUserId(comment.getId(), currentUserId))
                .content(deleted ? null : comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostCommentResponse> getComments(UUID postId, UUID currentUserId, Pageable pageable) {
        getPost(postId);
        return postCommentRepository
                .findTopLevelVisible(postId, pageable)
                .map(comment -> toCommentResponse(comment, null, currentUserId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostCommentResponse> getReplies(UUID commentId, UUID currentUserId) {
        postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        return postCommentRepository.findVisibleReplies(commentId)
                .stream()
                .map(comment -> toCommentResponse(comment, commentId, currentUserId))
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

        policyContentValidator.validateComment(request.getContent());

        PostComment saved = postCommentRepository.save(PostComment.builder()
                .post(post)
                .user(user)
                .parentComment(parentComment)
                .content(request.getContent().trim())
                .build());

        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.COMMENT_ADDED,
                "{\"postId\":\"" + postId + "\"}");

        // Push COMMENT event → Queue → Listener creates notification FIFO
        notificationEventPublisher.publish(
                user.getId(),
                post.getAuthor().getId(),
                NotificationType.COMMENT,
                user.getFullName() + " đã bình luận về bài viết của bạn.",
                post.getId()
        );

        return toCommentResponse(saved, saved.getParentComment() == null ? null : saved.getParentComment().getId(), request.getUserId());
    }

    @Override
    public PostCommentResponse updateComment(UUID commentId, UUID userId, UpdateCommentRequest request) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (!comment.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa bình luận này");
        }
        comment.setContent(request.getContent().trim());
        PostComment saved = postCommentRepository.save(comment);
        return toCommentResponse(saved, saved.getParentComment() == null ? null : saved.getParentComment().getId(), userId);
    }

    @Override
    public boolean deleteComment(UUID commentId, UUID userId) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (!comment.getUser().getId().equals(userId)) {
            throw new ValidationException("Bạn không có quyền xóa bình luận này");
        }
        PostComment parent = comment.getParentComment();
        long childCount = postCommentRepository.countByParentCommentId(commentId);
        if (childCount > 0) {
            comment.setDeleted(true);
            postCommentRepository.save(comment);
            return true; // soft deleted — hiện placeholder
        }
        postCommentRepository.delete(comment);
        cleanupSoftDeletedAncestors(parent);
        return false; // hard deleted — xóa khỏi danh sách
    }

    private void cleanupSoftDeletedAncestors(PostComment ancestor) {
        if (ancestor == null || !ancestor.isDeleted()) return;
        long remaining = postCommentRepository.countByParentCommentId(ancestor.getId());
        if (remaining == 0) {
            PostComment grandparent = ancestor.getParentComment();
            postCommentRepository.delete(ancestor);
            cleanupSoftDeletedAncestors(grandparent);
        }
    }

    @Override
    public void likeComment(UUID commentId, UUID userId) {
        if (postCommentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) return;
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        User user = getUser(userId, "User not found");
        postCommentLikeRepository.save(PostCommentLike.builder()
                .comment(comment)
                .user(user)
                .build());
    }

    @Override
    @Transactional
    public void unlikeComment(UUID commentId, UUID userId) {
        postCommentLikeRepository.deleteByCommentIdAndUserId(commentId, userId);
    }

    @Override
    public PostShareResponse sharePost(UUID postId, SharePostRequest request) {
        Post post = getPost(postId);
        User user = getUser(request.getUserId(), "Share user not found");

        if (!postShareRepository.existsByPostIdAndUserId(postId, request.getUserId())) {
            postShareRepository.save(PostShare.builder()
                    .post(post)
                    .user(user)
                    .sharedContent(trimToNull(request.getSharedContent()))
                    .build());

            activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.POST_SHARED,
                    "{\"postId\":\"" + postId + "\"}");
        }

        long shareCount = postShareRepository.countByPostId(postId);
        return PostShareResponse.builder()
                .postId(postId)
                .userId(user.getId())
                .userFullName(user.getFullName())
                .shareCount(shareCount)
                .build();
    }

    @Override
    public void savePost(SavePostRequest request) {
        if (postSavedRepository.existsByPostIdAndUserId(request.getPostId(), request.getUserId())) {
            return;
        }
        Post post = getPost(request.getPostId());
        User user = getUser(request.getUserId(), "User not found");
        postSavedRepository.save(PostSaved.builder().post(post).user(user).build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getSavedPosts(UUID userId) {
        List<UUID> postIds = postSavedRepository.findPostIdsByUserId(userId);
        if (postIds.isEmpty()) return Collections.emptyList();
        List<Post> posts = postRepository.findAllById(postIds);
        return processPostsBulk(posts, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CheckInSuggestionResponse> getCheckInSuggestions(UUID currentUserId, String province, String ward) {
        String normalizedProvince = trimToNull(province);
        String normalizedWard = trimToNull(ward);

        return postRepository.findCheckInSuggestions(currentUserId, normalizedProvince, normalizedWard)
                .stream()
                .map(item -> CheckInSuggestionResponse.builder()
                        .locationText(item.getLocationText())
                        .usageCount(item.getUsageCount() == null ? 0L : item.getUsageCount())
                        .build())
                .toList();
    }

    @Override
    public void unsavePost(UUID userId, UUID postId) {
        postSavedRepository.deleteByPostIdAndUserId(postId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getPostsByIds(List<UUID> postIds, UUID currentUserId) {
        if (postIds.isEmpty()) return Collections.emptyList();
        List<Post> posts = postRepository.findAllById(postIds);
        return processPostsBulk(posts, currentUserId);
    }

    @Override
    public PostResponse updatePrivacy(UUID postId, UUID userId, PostPrivacy privacy) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (!post.getAuthor().getId().equals(userId)) {
            throw new ValidationException("Bạn không có quyền chỉnh sửa bài viết này");
        }
        post.setPrivacy(privacy);
        return mapToResponse(postRepository.save(post), userId);
    }

    @Override
    public void reportPost(UUID postId, ReportPostRequest request) {
        if (request == null || request.getReporterId() == null) {
            throw new ValidationException("Reporter is required");
        }

        Post post = getPost(postId);
        User reporter = getUser(request.getReporterId(), "Reporter not found");
        if (post.getAuthor().getId().equals(reporter.getId())) {
            throw new ValidationException("Bạn không thể báo cáo bài viết của chính mình");
        }
        if (postReportRepository.existsByPostIdAndReporterId(postId, reporter.getId())) {
            throw new ValidationException("Bạn đã báo cáo bài viết này");
        }

        postReportRepository.save(PostReport.builder()
                .post(post)
                .reporter(reporter)
                .reason(trimToNull(request.getReason()))
                .createdAt(LocalDateTime.now())
                .build());

        adminPostReportNotificationClient.notifyPostReport(
                reporter.getId(),
                postId,
                reporter.getUsername(),
                request.getReason()
        );
    }

    @Override
    public void deletePost(UUID postId, UUID userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (!post.getAuthor().getId().equals(userId)) {
            throw new ValidationException("Bạn không có quyền xóa bài viết này");
        }
        String username = post.getAuthor().getUsername();
        postRepository.delete(post);
        activityLogService.log(userId, username, ActivityLogType.POST_DELETED,
                "{\"postId\":\"" + postId + "\"}");
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

    private void attachAllowedUsers(Post post, List<UUID> allowedUserIds) {
        if (allowedUserIds == null) {
            return;
        }
        for (UUID allowedUserId : allowedUserIds.stream().distinct().toList()) {
            post.getAudienceAllowances().add(PostAudienceAllowance.builder()
                    .post(post)
                    .allowedUser(getUser(allowedUserId, "Allowed user not found"))
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
        boolean savedByCurrentUser = currentUserId != null &&
                postSavedRepository.existsByPostIdAndUserId(post.getId(), currentUserId);

        return mapToResponseOptimized(post, currentUserId, reactionCounts, commentCount, shareCount, currentUserReaction, savedByCurrentUser);
    }

    private PostResponse mapToResponseOptimized(Post post, UUID currentUserId,
                                               Map<ReactionType, Long> reactionCountsMap,
                                               long commentCount,
                                               long shareCount,
                                               ReactionType currentUserReactionType,
                                               boolean savedByCurrentUser) {
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
                .savedByCurrentUser(savedByCurrentUser)
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
}
