package project.kconnecta.user.backend.feature.post.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostMediaRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdatePostPrivacyRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SavePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.ReportPostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.AddPostPollOptionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostPollRequest;
import project.kconnecta.user.backend.feature.post.dto.request.VotePostPollRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PendingCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.CheckInSuggestionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostMediaResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionCountResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionDetailsResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionUserResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostPollOptionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostPollResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostRateLimitStatus;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.SharedAlbumResponse;
import project.kconnecta.user.backend.feature.post.dto.response.SharedGroupResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;
import project.kconnecta.user.backend.feature.post.dto.response.ContentVerificationResponse;
import project.kconnecta.user.backend.feature.post.entity.*;
import project.kconnecta.user.backend.feature.post.entity.enums.MediaType;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.entity.enums.PostType;
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
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import project.kconnecta.user.backend.feature.album.entity.Album;
import project.kconnecta.user.backend.feature.album.repository.AlbumMediaRepository;
import project.kconnecta.user.backend.feature.album.repository.AlbumRepository;
import project.kconnecta.user.backend.feature.interest.entity.enums.InterestEventType;
import project.kconnecta.user.backend.feature.interest.service.PostTopicService;
import project.kconnecta.user.backend.feature.interest.service.UserInterestService;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.page.repository.PageRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import org.springframework.data.redis.core.RedisTemplate;
import project.kconnecta.user.backend.exception.ForbiddenException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

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
    private final project.kconnecta.user.backend.feature.post.repository.CommentReportRepository commentReportRepository;
    private final project.kconnecta.user.backend.feature.post.service.CommentViolationService commentViolationService;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final PageRepository pageRepository;
    private final CloudinaryService cloudinaryService;
    private final NotificationEventPublisher notificationEventPublisher;
    private final ActivityLogService activityLogService;
    private final project.kconnecta.user.backend.integration.AdminPostReportNotificationClient adminPostReportNotificationClient;
    private final PolicyContentValidator policyContentValidator;
    private final project.kconnecta.user.backend.feature.policy.service.AiModerationPolicyReader aiModerationPolicyReader;
    private final project.kconnecta.user.backend.feature.policy.service.RecommendationPolicyReader recommendationPolicyReader;
    private final RedisSearchIndexer redisSearchIndexer;
    private final RedisTemplate<String, Object> redisTemplate;
    private final project.kconnecta.user.backend.feature.ai.GeminiModerationService geminiModerationService;
    private final FriendshipRepository friendshipRepository;
    private final SettingsService settingsService;
    private final AlbumRepository albumRepository;
    private final AlbumMediaRepository albumMediaRepository;
    private final PostPollRepository postPollRepository;
    private final PostPollOptionRepository postPollOptionRepository;
    private final PostPollVoteRepository postPollVoteRepository;
    private final PostTopicService postTopicService;
    private final UserInterestService userInterestService;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Override
    public PostRateLimitStatus getPostRateLimitStatus(UUID userId) {
        return policyContentValidator.getPostRateLimitStatus(userId);
    }

    @Override
    public PostRateLimitStatus getPostEditRateLimitStatus(UUID userId) {
        return policyContentValidator.getPostEditRateLimitStatus(userId);
    }

    @Override
    public PostResponse createPost(CreatePostRequest request) {
        User author = getUser(request.getAuthorId(), "Author not found");
        List<CreatePostMediaRequest> mediaRequests = request.getMedia() == null ? Collections.emptyList() : request.getMedia();
        PostType postType = request.getPostType() == null ? PostType.POST : request.getPostType();

        if ((request.getContent() == null || request.getContent().isBlank())
                && mediaRequests.isEmpty()
                && request.getPoll() == null
                && request.getSharedGroupId() == null) {
            throw new ValidationException("Post must have content or media");
        }

        if (request.getPoll() != null) {
            if (request.getGroupId() == null) {
                throw new ValidationException("Polls are only supported in group posts");
            }
            if (postType == PostType.REEL) {
                throw new ValidationException("Reels cannot include polls");
            }
            if (request.getContent() == null || request.getContent().isBlank()) {
                throw new ValidationException("Bạn không thể tạo cuộc thăm dò ý kiến không chứa văn bản trong bài viết.");
            }
            if (normalizePollOptions(request.getPoll().getOptions()).size() < 2) {
                throw new ValidationException("Cuộc thăm dò ý kiến cần ít nhất 2 lựa chọn");
            }
        }

        policyContentValidator.validatePost(
                author.getId(),
                request.getContent(),
                mediaRequests.size()
        );

        // AI duyệt MỌI bài có text (không còn cổng lọc từ khóa isSuspect), để bắt cả
        // nội dung lách luật bằng tiếng lóng/ghép chữ mà danh sách từ khóa không phủ được.
        if (aiModerationPolicyReader.isEnabled()
                && request.getContent() != null
                && !request.getContent().isBlank()) {
            geminiModerationService.moderate(request.getContent()).ifPresent(moderation -> {
                if (!moderation.safe()) {
                    throw new ValidationException(
                            "Nội dung vi phạm tiêu chuẩn cộng đồng: " + moderation.reason());
                }
            });
        }

        PostStatus status = request.getStatus() == null ? PostStatus.PUBLISHED : request.getStatus();
        PostPrivacy privacy = request.getPrivacy() == null
                ? settingsService.getDefaultPostPrivacy(request.getAuthorId())
                : request.getPrivacy();

        if (status == PostStatus.SCHEDULED && request.getScheduledAt() == null) {
            throw new ValidationException("scheduledAt is required when status is SCHEDULED");
        }

        if (status == PostStatus.SCHEDULED) {
            if (!request.getScheduledAt().isAfter(LocalDateTime.now())) {
                throw new ValidationException("scheduledAt must be in the future");
            }
        } else if (request.getScheduledAt() != null
                && request.getScheduledAt().isAfter(LocalDateTime.now())
                && status != PostStatus.PUBLISHED) {
            status = PostStatus.SCHEDULED;
        }

        log.info("create post: authorId={}, status={}, scheduledAt={}, groupId={}, pageId={}, postType={}",
                request.getAuthorId(), status, request.getScheduledAt(), request.getGroupId(), request.getPageId(), postType);

        if (postType == PostType.REEL) {
            if (request.getGroupId() != null || request.getPageId() != null) {
                throw new ValidationException("Reels cannot be posted to a group or page");
            }
            if (request.getSharedGroupId() != null || request.getSharedAlbumId() != null) {
                throw new ValidationException("Reels cannot share groups or albums");
            }
            validateReelMedia(mediaRequests);
        }

        if (request.getGroupId() != null && request.getPageId() != null) {
            throw new ValidationException("Cannot post to both a group and a page");
        }

        assertSupportedPostPrivacy(privacy);
        if (request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
            throw new ValidationException("excludedUserIds is no longer supported");
        }
        if (request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
            throw new ValidationException("allowedUserIds is no longer supported");
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

        project.kconnecta.user.backend.feature.page.entity.Page userPage = null;
        if (request.getPageId() != null) {
            userPage = pageRepository.findById(request.getPageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + request.getPageId()));

            if (!userPage.getCreatedBy().getId().equals(author.getId())) {
                throw new ValidationException("Only page owner can post on this page");
            }

            if (privacy != PostPrivacy.PUBLIC) {
                privacy = PostPrivacy.PUBLIC;
            }
            if (request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
                throw new ValidationException("Audience exclusions are not supported for page posts");
            }
            if (request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
                throw new ValidationException("Audience allowances are not supported for page posts");
            }
        }

        Group sharedGroup = null;
        if (request.getSharedGroupId() != null) {
            sharedGroup = groupRepository.findById(request.getSharedGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Shared group not found: " + request.getSharedGroupId()));
        }

        Album sharedAlbum = null;
        if (request.getSharedAlbumId() != null) {
            sharedAlbum = albumRepository.findById(request.getSharedAlbumId())
                    .orElseThrow(() -> new ResourceNotFoundException("Shared album not found: " + request.getSharedAlbumId()));
        }

        Post post = Post.builder()
                .author(author)
                .group(group)
                .page(userPage)
                .sharedGroup(sharedGroup)
                .sharedAlbum(sharedAlbum)
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
                .postType(postType)
                .build();

        attachMedia(post, mediaRequests);
        attachExcludedUsers(post, request.getExcludedUserIds());
        attachAllowedUsers(post, request.getAllowedUserIds());
        attachTaggedUsers(post, request.getTaggedUserIds());

        Post saved = postRepository.save(post);
        if (request.getPoll() != null) {
            attachPoll(saved, author, request.getPoll());
            saved = postRepository.save(saved);
        }
        if (saved.getStatus() == PostStatus.PUBLISHED) {
            postTopicService.syncTopics(saved.getId(), saved.getContent());
        }
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
    public PostResponse updatePost(UUID postId, UUID userId, UpdatePostRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new ValidationException("Bạn không có quyền chỉnh sửa bài viết này");
        }
        if (post.getStatus() == PostStatus.DELETED) {
            throw new ValidationException("Không thể chỉnh sửa bài viết đã xóa");
        }
        if ("LIVE_POST".equals(post.getBackgroundStyle())) {
            throw new ValidationException("Không thể chỉnh sửa bài viết live");
        }

        String newContent = request.getContent() != null ? trimToNull(request.getContent()) : post.getContent();
        List<CreatePostMediaRequest> mediaRequests = request.getMedia() != null
                ? request.getMedia()
                : post.getMedia().stream()
                        .map(m -> {
                            CreatePostMediaRequest mediaRequest = new CreatePostMediaRequest();
                            mediaRequest.setMediaType(m.getMediaType());
                            mediaRequest.setFileUrl(m.getFileUrl());
                            mediaRequest.setThumbnailUrl(m.getThumbnailUrl());
                            mediaRequest.setSortOrder(m.getSortOrder());
                            return mediaRequest;
                        })
                        .toList();

        if ((newContent == null || newContent.isBlank()) && mediaRequests.isEmpty()) {
            throw new ValidationException("Bài viết phải có nội dung hoặc media");
        }

        policyContentValidator.validatePostUpdate(userId, newContent, mediaRequests.size());

        boolean contentChanged = request.getContent() != null
                && !Objects.equals(newContent, post.getContent());
        // Duyệt AI mọi nội dung mới khi text thay đổi — chặn lách bằng cách tạo bài
        // sạch rồi sửa thành nội dung vi phạm.
        if (contentChanged
                && aiModerationPolicyReader.isEnabled()
                && newContent != null
                && !newContent.isBlank()) {
            geminiModerationService.moderate(newContent).ifPresent(moderation -> {
                if (!moderation.safe()) {
                    throw new ValidationException(
                            "Không thể lưu thay đổi bài viết. Lý do: nội dung vi phạm tiêu chuẩn cộng đồng ("
                                    + moderation.reason() + "). Vui lòng chỉnh sửa và thử lại.");
                }
            });
        }

        PostPrivacy privacy = request.getPrivacy() != null ? request.getPrivacy() : post.getPrivacy();
        if (post.getGroup() != null && privacy != PostPrivacy.PUBLIC) {
            privacy = PostPrivacy.PUBLIC;
        }
        if (post.getPage() != null && privacy != PostPrivacy.PUBLIC) {
            privacy = PostPrivacy.PUBLIC;
        }

        assertSupportedPostPrivacy(privacy);
        if (request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
            throw new ValidationException("excludedUserIds is no longer supported");
        }
        if (request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
            throw new ValidationException("allowedUserIds is no longer supported");
        }
        if (post.getGroup() != null) {
            if (request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
                throw new ValidationException("Audience exclusions are not supported for group posts");
            }
            if (request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
                throw new ValidationException("Audience allowances are not supported for group posts");
            }
        }
        if (post.getPage() != null) {
            if (request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
                throw new ValidationException("Audience exclusions are not supported for page posts");
            }
            if (request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
                throw new ValidationException("Audience allowances are not supported for page posts");
            }
        }

        post.setContent(newContent);
        post.setPrivacy(privacy);
        if (request.getLocationText() != null) {
            post.setLocationText(trimToNull(request.getLocationText()));
        }

        if (request.getMedia() != null) {
            post.getMedia().clear();
            attachMedia(post, mediaRequests);
            post.setImageUrl(mediaRequests.isEmpty() ? null : mediaRequests.get(0).getFileUrl().trim());
        }

        if (request.getExcludedUserIds() != null) {
            post.getAudienceExclusions().clear();
            attachExcludedUsers(post, request.getExcludedUserIds());
        }
        if (request.getAllowedUserIds() != null) {
            post.getAudienceAllowances().clear();
            attachAllowedUsers(post, request.getAllowedUserIds());
        }
        if (request.getTaggedUserIds() != null) {
            post.getMentions().clear();
            attachTaggedUsers(post, request.getTaggedUserIds());
        }

        applyScheduleChanges(post, request);

        Post saved = postRepository.save(post);
        if (saved.getStatus() == PostStatus.PUBLISHED) {
            postTopicService.syncTopics(saved.getId(), saved.getContent());
        }
        return mapToResponse(saved, userId);
    }

    private void applyScheduleChanges(Post post, UpdatePostRequest request) {
        if (request.getStatus() == null && request.getScheduledAt() == null) {
            return;
        }

        if (post.getStatus() != PostStatus.SCHEDULED && post.getStatus() != PostStatus.PUBLISHED) {
            if (request.getStatus() != null || request.getScheduledAt() != null) {
                throw new ValidationException("Chỉ có thể đổi lịch đăng với bài viết đã lên lịch hoặc đã đăng");
            }
            return;
        }

        if (request.getStatus() == PostStatus.PUBLISHED) {
            if (post.getStatus() == PostStatus.SCHEDULED) {
                post.setStatus(PostStatus.PUBLISHED);
                post.setPublishedAt(LocalDateTime.now());
                post.setScheduledAt(null);
            }
            return;
        }

        if (post.getStatus() != PostStatus.SCHEDULED) {
            if (request.getScheduledAt() != null || request.getStatus() == PostStatus.SCHEDULED) {
                throw new ValidationException("Không thể chuyển bài đã đăng sang trạng thái lên lịch");
            }
            return;
        }

        LocalDateTime nextScheduledAt = request.getScheduledAt() != null
                ? request.getScheduledAt()
                : post.getScheduledAt();
        if (nextScheduledAt == null) {
            throw new ValidationException("scheduledAt is required when status is SCHEDULED");
        }
        if (!nextScheduledAt.isAfter(LocalDateTime.now())) {
            throw new ValidationException("scheduledAt must be in the future");
        }
        post.setStatus(PostStatus.SCHEDULED);
        post.setScheduledAt(nextScheduledAt);
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

            // Re-moderate content at publish time — catches cases where the API key
            // was missing at creation time or policy has since changed.
            if (aiModerationPolicyReader.isEnabled()
                    && post.getContent() != null
                    && !post.getContent().isBlank()) {
                var moderation = geminiModerationService.moderate(post.getContent());
                if (moderation.isPresent() && !moderation.get().safe()) {
                    post.setStatus(PostStatus.REJECTED);
                    post.setModerationFailReason(moderation.get().reason());
                    postRepository.save(post);
                    log.warn("scheduler reject: postId={}, reason={}", post.getId(), moderation.get().reason());
                    continue;
                }
            }

            post.setStatus(PostStatus.PUBLISHED);
            post.setPublishedAt(now);
            Post saved = postRepository.save(post);
            postTopicService.syncTopics(saved.getId(), saved.getContent());
            redisSearchIndexer.indexPost(saved);
            User author = saved.getAuthor();
            activityLogService.log(author.getId(), author.getUsername(), ActivityLogType.POST_CREATED,
                    "{\"postId\":\"" + saved.getId() + "\",\"scheduled\":true}");
            count++;
        }
        return count;
    }

    /** Max comments AI-moderated per scheduler tick — keeps headroom under the shared 15 RPM / 500 RPD Gemini quota. */
    private static final int COMMENT_MODERATION_BATCH = 8;
    /** After this many failed AI attempts a comment drops out of the queue (stays PENDING for admin), so it can't starve newer ones. */
    private static final int MAX_MODERATION_ATTEMPTS = 3;
    /** Bao lâu thì một comment đã được AI duyệt mới được phép gọi AI lại khi bị report. */
    private static final java.time.Duration REPORT_RECHECK_AFTER = java.time.Duration.ofHours(24);
    /** Đủ số reporter KHÁC NHAU này thì ép AI duyệt lại ngay, bất kể vừa duyệt. */
    private static final int REPORT_FORCE_RECHECK_REPORTERS = 3;

    @Override
    public int moderatePendingComments() {
        if (!aiModerationPolicyReader.isEnabled()) {
            return 0;
        }
        Page<PostComment> pending = postCommentRepository.findByStatusAndModerationAttemptsLessThanOrderByCreatedAtAsc(
                CommentStatus.PENDING, MAX_MODERATION_ATTEMPTS, PageRequest.of(0, COMMENT_MODERATION_BATCH));
        if (pending.isEmpty()) {
            return 0;
        }

        int resolved = 0;
        for (PostComment comment : pending.getContent()) {
            try {
                // Report có thể đã gọi AI sync (SAFE) trước khi job chạy — không gọi lại API.
                if (comment.getAiModerationStatus() == AiModerationStatus.SAFE) {
                    comment.setStatus(CommentStatus.APPROVED);
                    comment.setModerationFailReason(null);
                    postCommentRepository.save(comment);
                    publishCommentNotification(comment);
                    resolved++;
                    continue;
                }
                var moderation = geminiModerationService.moderate(comment.getContent());
                if (moderation.isEmpty()) {
                    // Hết quota / mọi model fail → fail-closed: giữ PENDING (ẩn) cho admin duyệt tay.
                    comment.setModerationAttempts(comment.getModerationAttempts() + 1);
                    comment.setAiModerationStatus(project.kconnecta.user.backend.feature.post.entity.AiModerationStatus.FAILED);
                    postCommentRepository.save(comment);
                    continue;
                }
                if (moderation.get().safe()) {
                    comment.setStatus(CommentStatus.APPROVED);
                    comment.setModerationFailReason(null);
                    comment.setAiModerationStatus(project.kconnecta.user.backend.feature.post.entity.AiModerationStatus.SAFE);
                    comment.setLastModeratedAt(LocalDateTime.now());
                    postCommentRepository.save(comment);
                    publishCommentNotification(comment);
                } else {
                    comment.setStatus(CommentStatus.REJECTED);
                    comment.setModerationFailReason(moderation.get().reason());
                    comment.setAiModerationStatus(project.kconnecta.user.backend.feature.post.entity.AiModerationStatus.UNSAFE);
                    comment.setLastModeratedAt(LocalDateTime.now());
                    postCommentRepository.save(comment);
                    notificationEventPublisher.publish(
                            null,
                            comment.getUser().getId(),
                            NotificationType.SYSTEM,
                            "Cảnh báo: bình luận của bạn đã bị ẩn do vi phạm tiêu chuẩn cộng đồng. Vui lòng tuân thủ chính sách để tránh bị hạn chế.",
                            comment.getId()
                    );
                    log.warn("comment moderation reject: commentId={}, reason={}", comment.getId(), moderation.get().reason());
                    commentViolationService.recordAiUnsafeViolation(
                            comment.getUser().getId(), comment.getId(), null, comment.getContent(), moderation.get().reason());
                }
                resolved++;
            } catch (Exception e) {
                log.warn("comment moderation error: commentId={}, error={}", comment.getId(), e.getMessage());
            }
        }
        return resolved;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PendingCommentResponse> listPendingComments(Pageable pageable) {
        return postCommentRepository.findByStatusOrderByCreatedAtAsc(CommentStatus.PENDING, pageable)
                .map(c -> PendingCommentResponse.builder()
                        .id(c.getId())
                        .postId(c.getPost().getId())
                        .userId(c.getUser().getId())
                        .username(c.getUser().getUsername())
                        .content(c.getContent())
                        .moderationAttempts(c.getModerationAttempts())
                        .createdAt(c.getCreatedAt())
                        .build());
    }

    @Override
    public void approveComment(UUID commentId) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (comment.getStatus() != CommentStatus.PENDING) {
            throw new DuplicateResourceException("Bình luận đã được xử lý trước đó");
        }
        boolean wasHidden = comment.getStatus() != CommentStatus.APPROVED;
        comment.setStatus(CommentStatus.APPROVED);
        comment.setModerationFailReason(null);
        postCommentRepository.save(comment);
        if (wasHidden) {
            publishCommentNotification(comment);
        }
    }

    @Override
    public void rejectComment(UUID commentId, String reason) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (comment.getStatus() != CommentStatus.PENDING) {
            throw new DuplicateResourceException("Bình luận đã được xử lý trước đó");
        }
        comment.setStatus(CommentStatus.REJECTED);
        comment.setModerationFailReason(reason);
        postCommentRepository.save(comment);
    }

    private static final String UPLOAD_OWNERSHIP_PREFIX = "post:upload:";
    private static final Duration UPLOAD_OWNERSHIP_TTL = Duration.ofHours(2);

    @Override
    public String uploadPostImage(UUID uploaderId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Image file is required");
        }
        policyContentValidator.validatePostMediaUpload(file);
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
        cloudinaryService.deleteAssetByUrl(url, inferMediaTypeFromUrl(url));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> getAllPosts(UUID currentUserId, Pageable pageable) {
        var weights = recommendationPolicyReader.getFeedWeights();
        Page<Post> postPage = postRepository.findHomeFeedPostsWithScoring(
                currentUserId,
                weights.affinity(),
                weights.engagement(),
                weights.recency(),
                weights.topic(),
                pageable);
        List<Post> diversified = applyAuthorDiversity(postPage.getContent(), 3);
        List<PostResponse> responses = processPostsBulk(diversified, currentUserId);

        // Only adjust total when the DB itself returned a short page (true last page).
        long dbPageSize = postPage.getContent().size();
        long adjustedTotal = dbPageSize < pageable.getPageSize()
                ? pageable.getOffset() + diversified.size()
                : postPage.getTotalElements();

        // On page 0, inject recent shares from the current user + friends (last 7 days, at most 5 items)
        if (pageable.getPageNumber() == 0 && currentUserId != null) {
            List<UUID> friendIds = friendshipRepository.findFriendIdsByUserIdAndStatus(currentUserId, FriendshipStatus.ACCEPTED);
            List<UUID> shareUserIds = new ArrayList<>(friendIds);
            shareUserIds.add(currentUserId); // include user's own shares
            int shareLimit = Math.min(5, Math.max(1, pageable.getPageSize() / 2));
            List<PostShare> recentShares = postShareRepository.findRecentSharesByUserIds(
                    shareUserIds,
                    LocalDateTime.now().minusDays(7),
                    org.springframework.data.domain.PageRequest.of(0, shareLimit)
            );
            if (!recentShares.isEmpty()) {
                List<PostResponse> shareWrappers = toShareWrappers(recentShares, currentUserId);
                if (!shareWrappers.isEmpty()) {
                    // Trim regular posts to keep total count = pageSize
                    int postsToKeep = Math.max(0, pageable.getPageSize() - shareWrappers.size());
                    List<PostResponse> trimmedPosts = responses.subList(0, Math.min(responses.size(), postsToKeep));
                    // Keep the recommendation-weighted order of regular posts as the feed backbone.
                    // Sort ONLY the shares among themselves (recent first) and append them after the
                    // ranked posts — do NOT re-sort the whole page by time, which would discard the weights.
                    List<PostResponse> sortedShares = shareWrappers.stream()
                            .sorted(Comparator.comparing(
                                    r -> r.getCreatedAt() != null ? r.getCreatedAt() : LocalDateTime.MIN,
                                    Comparator.reverseOrder()))
                            .toList();
                    List<PostResponse> merged = Stream.concat(trimmedPosts.stream(), sortedShares.stream())
                            .toList();
                    return new PageImpl<>(merged, pageable, adjustedTotal + shareWrappers.size());
                }
            }
        }

        return new PageImpl<>(responses, pageable, adjustedTotal);
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
        var weights = recommendationPolicyReader.getReelWeights();
        Page<Post> postPage = postRepository.findWatchFeedPosts(
                currentUserId,
                weights.affinity(),
                weights.engagement(),
                weights.recency(),
                weights.topic(),
                pageable);
        List<Post> diversified = applyAuthorDiversity(postPage.getContent(), 2);
        List<PostResponse> responses = processPostsBulk(diversified, currentUserId);

        long dbPageSize = postPage.getContent().size();
        long adjustedTotal = dbPageSize < pageable.getPageSize()
                ? pageable.getOffset() + diversified.size()
                : postPage.getTotalElements();

        return new PageImpl<>(responses, pageable, adjustedTotal);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> getPostsByUserId(UUID authorId, UUID currentUserId, Pageable pageable) {
        return getPostsByUserId(authorId, currentUserId, null, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> getPostsByUserId(UUID authorId, UUID currentUserId, PostStatus statusFilter, Pageable pageable) {
        if (!authorId.equals(currentUserId) && !settingsService.canViewProfile(currentUserId, authorId)) {
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }

        if (PostStatus.SCHEDULED.equals(statusFilter)) {
            if (currentUserId == null || !authorId.equals(currentUserId)) {
                return new PageImpl<>(Collections.emptyList(), pageable, 0);
            }
            List<Post> scheduledPosts = postRepository.findScheduledByAuthorId(authorId);
            hydratePostAssociations(scheduledPosts);
            List<PostResponse> responses = processPostsBulk(scheduledPosts, currentUserId);
            return paginateMergedList(responses, pageable);
        }

        // Load all accessible posts for this author (privacy-filtered), then merge with shares in memory.
        // Native SQL avoids heavy JPQL parsing that can OOM on small Render instances.
        List<Post> allPosts = postRepository
                .findByAuthorIdWithPrivacy(authorId, currentUserId, Pageable.unpaged())
                .getContent();
        hydratePostAssociations(allPosts);
        List<PostResponse> postResponses = processPostsBulk(allPosts, currentUserId);
        if (PostStatus.PUBLISHED.equals(statusFilter)) {
            postResponses = postResponses.stream()
                    .filter(r -> PostStatus.PUBLISHED.equals(r.getStatus()))
                    .toList();
        }

        List<PostShare> shares = postShareRepository.findSharesWithPostByUserId(authorId);
        List<PostResponse> shareWrappers = toShareWrappers(shares, currentUserId);

        List<PostResponse> merged = Stream.concat(postResponses.stream(), shareWrappers.stream())
                .sorted(profilePostSortComparator())
                .toList();

        return paginateMergedList(merged, pageable);
    }

    private static Comparator<PostResponse> profilePostSortComparator() {
        return (a, b) -> {
            boolean aScheduled = PostStatus.SCHEDULED.equals(a.getStatus());
            boolean bScheduled = PostStatus.SCHEDULED.equals(b.getStatus());
            if (aScheduled != bScheduled) {
                return aScheduled ? -1 : 1;
            }
            if (aScheduled) {
                LocalDateTime aTime = a.getScheduledAt() != null ? a.getScheduledAt() : a.getCreatedAt();
                LocalDateTime bTime = b.getScheduledAt() != null ? b.getScheduledAt() : b.getCreatedAt();
                if (aTime == null && bTime == null) {
                    return 0;
                }
                if (aTime == null) {
                    return 1;
                }
                if (bTime == null) {
                    return -1;
                }
                return aTime.compareTo(bTime);
            }
            LocalDateTime aTime = a.getPublishedAt() != null ? a.getPublishedAt() : a.getCreatedAt();
            LocalDateTime bTime = b.getPublishedAt() != null ? b.getPublishedAt() : b.getCreatedAt();
            if (aTime == null && bTime == null) {
                return 0;
            }
            if (aTime == null) {
                return 1;
            }
            if (bTime == null) {
                return -1;
            }
            return bTime.compareTo(aTime);
        };
    }

    private static Page<PostResponse> paginateMergedList(List<PostResponse> merged, Pageable pageable) {
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), merged.size());
        List<PostResponse> page = start >= merged.size() ? Collections.emptyList() : new ArrayList<>(merged.subList(start, end));
        return new PageImpl<>(page, pageable, merged.size());
    }

    private void hydratePostAssociations(List<Post> posts) {
        if (posts.isEmpty()) {
            return;
        }

        Set<UUID> authorIds = new HashSet<>();
        Set<UUID> groupIds = new HashSet<>();
        Set<UUID> pageIds = new HashSet<>();

        for (Post post : posts) {
            if (post.getAuthor() != null) {
                authorIds.add(post.getAuthor().getId());
            }
            if (post.getGroup() != null) {
                groupIds.add(post.getGroup().getId());
            }
            if (post.getPage() != null) {
                pageIds.add(post.getPage().getId());
            }
        }

        Map<UUID, User> authorsById = authorIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(authorIds).stream()
                        .collect(Collectors.toMap(User::getId, user -> user));
        Map<UUID, Group> groupsById = groupIds.isEmpty()
                ? Collections.emptyMap()
                : groupRepository.findAllById(groupIds).stream()
                        .collect(Collectors.toMap(Group::getId, group -> group));
        Map<UUID, project.kconnecta.user.backend.feature.page.entity.Page> pagesById = pageIds.isEmpty()
                ? Collections.emptyMap()
                : pageRepository.findAllById(pageIds).stream()
                        .collect(Collectors.toMap(project.kconnecta.user.backend.feature.page.entity.Page::getId, page -> page));

        for (Post post : posts) {
            if (post.getAuthor() != null) {
                User author = authorsById.get(post.getAuthor().getId());
                if (author != null) {
                    post.setAuthor(author);
                }
            }
            if (post.getGroup() != null) {
                Group group = groupsById.get(post.getGroup().getId());
                if (group != null) {
                    post.setGroup(group);
                }
            }
            if (post.getPage() != null) {
                project.kconnecta.user.backend.feature.page.entity.Page page = pagesById.get(post.getPage().getId());
                if (page != null) {
                    post.setPage(page);
                }
            }
        }
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
    public Page<PostResponse> getGroupFeedPosts(UUID currentUserId, Pageable pageable) {
        if (currentUserId == null) return Page.empty(pageable);
        Page<Post> postPage = postRepository.findGroupFeedPostsByUserId(currentUserId, pageable);
        List<PostResponse> responses = processPostsBulk(postPage.getContent(), currentUserId);
        return new PageImpl<>(responses, pageable, postPage.getTotalElements());
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
        final Map<UUID, PostPollResponse> pollResponses = buildPollResponseMap(postIds, currentUserId);

        return posts.stream()
                .map(post -> mapToResponseOptimized(post, currentUserId,
                        finalReactionCounts.getOrDefault(post.getId(), Collections.emptyMap()),
                        finalCommentCounts.getOrDefault(post.getId(), 0L),
                        finalShareCounts.getOrDefault(post.getId(), 0L),
                        finalUserReactions.get(post.getId()),
                        finalSavedPostIds.contains(post.getId()),
                        pollResponses.get(post.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PostResponse getPostById(UUID id, UUID currentUserId) {
        return mapToResponse(getPost(id), currentUserId);
    }

    @Override
    public PostReactionResponse addReaction(UUID postId, AddReactionRequest request) {
        InteractionTarget target = resolveInteractionTarget(postId);
        User user = getUser(request.getUserId(), "Reaction user not found");

        PostReaction reaction;
        if (target.isShare()) {
            reaction = postReactionRepository.findByShareIdAndUserId(target.share().getId(), request.getUserId())
                    .orElseGet(() -> PostReaction.builder()
                            .post(target.post())
                            .share(target.share())
                            .user(user)
                            .build());
        } else {
            reaction = postReactionRepository.findByPostIdAndUserId(target.post().getId(), request.getUserId())
                    .orElseGet(() -> PostReaction.builder().post(target.post()).user(user).build());
        }
        reaction.setReactionType(request.getReactionType());

        PostReaction saved = postReactionRepository.save(reaction);
        userInterestService.recordInteraction(
                request.getUserId(), target.post().getId(), InterestEventType.REACTION);
        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.REACTION_ADDED,
                "{\"targetId\":\"" + target.getTargetId() + "\",\"type\":\"" + request.getReactionType() + "\"}");

        UUID recipientId = target.isShare()
                ? target.share().getUser().getId()
                : target.post().getAuthor().getId();
        notificationEventPublisher.publish(
                user.getId(),
                recipientId,
                NotificationType.LIKE,
                user.getFullName() + (target.isShare() ? " đã thích bài chia sẻ của bạn." : " đã thích bài viết của bạn."),
                target.getTargetId()
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
        InteractionTarget target = resolveInteractionTarget(postId);
        getUser(userId, "Reaction user not found");
        if (target.isShare()) {
            postReactionRepository.deleteByShareIdAndUserId(target.share().getId(), userId);
        } else {
            postReactionRepository.deleteByPostIdAndUserId(target.post().getId(), userId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PostReactionDetailsResponse getReactionDetails(UUID postId) {
        InteractionTarget target = resolveInteractionTarget(postId);
        List<PostReaction> reactions = target.isShare()
                ? postReactionRepository.findAllByShareIdOrderByCreatedAtDesc(target.share().getId())
                : postReactionRepository.findAllByPostIdOrderByCreatedAtDesc(target.post().getId());

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
                .postId(target.getTargetId())
                .totalCount(reactions.size())
                .counts(counts)
                .reactions(users)
                .build();
    }

    private PostCommentResponse toCommentResponse(PostComment comment, UUID parentCommentId, UUID currentUserId) {
        boolean isAuthor = currentUserId != null && comment.getUser().getId().equals(currentUserId);
        // Ẩn nội dung nếu: đã xóa, HOẶC bị từ chối (REJECTED) — ẩn với mọi người kể cả tác giả,
        // HOẶC đang chờ duyệt (PENDING) và người xem không phải tác giả.
        boolean masked = comment.isDeleted()
                || comment.getStatus() == CommentStatus.REJECTED
                || (comment.getStatus() != CommentStatus.APPROVED && !isAuthor);
        return PostCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .userId(masked ? null : comment.getUser().getId())
                .username(masked ? null : comment.getUser().getUsername())
                .userFullName(masked ? null : comment.getUser().getFullName())
                .userAvatarUrl(masked ? null : comment.getUser().getAvatarUrl())
                .parentCommentId(parentCommentId)
                .isDeleted(comment.isDeleted())
                .replyCount(postCommentRepository.countByParentCommentId(comment.getId()))
                .likeCount(masked ? 0 : postCommentLikeRepository.countByCommentId(comment.getId()))
                .isLikedByCurrentUser(!masked && currentUserId != null && postCommentLikeRepository.existsByCommentIdAndUserId(comment.getId(), currentUserId))
                .myReaction(masked || currentUserId == null ? null
                        : postCommentLikeRepository.findByCommentIdAndUserId(comment.getId(), currentUserId)
                                .map(l -> l.getReactionType().name()).orElse(null))
                .reactionCounts(masked ? null : commentReactionCounts(comment.getId()))
                .content(masked ? null : comment.getContent())
                .imageUrl(masked ? null : comment.getImageUrl())
                // Trạng thái kiểm duyệt chỉ lộ cho chính tác giả (để hiện nhãn "đang chờ duyệt" / lý do từ chối).
                .moderationStatus(isAuthor ? comment.getStatus().name() : null)
                .moderationFailReason(isAuthor ? comment.getModerationFailReason() : null)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    /** Đếm reaction theo loại cho 1 bình luận → map {"LIKE":3,"LOVE":1}. */
    private Map<String, Long> commentReactionCounts(UUID commentId) {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : postCommentLikeRepository.countGroupedByReactionType(commentId)) {
            if (row[0] != null) {
                counts.put(((ReactionType) row[0]).name(), (Long) row[1]);
            }
        }
        return counts;
    }

    /** Push COMMENT event → Queue → Listener creates notification FIFO. */
    private void publishCommentNotification(PostComment comment) {
        boolean onShare = comment.getShare() != null;
        UUID recipientId = onShare
                ? comment.getShare().getUser().getId()
                : comment.getPost().getAuthor().getId();
        UUID referenceId = onShare ? comment.getShare().getId() : comment.getPost().getId();
        notificationEventPublisher.publish(
                comment.getUser().getId(),
                recipientId,
                NotificationType.COMMENT,
                comment.getUser().getFullName() + (onShare ? " đã bình luận bài chia sẻ của bạn." : " đã bình luận về bài viết của bạn."),
                referenceId
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostCommentResponse> getComments(UUID postId, UUID currentUserId, Pageable pageable) {
        InteractionTarget target = resolveInteractionTarget(postId);
        if (target.isShare()) {
            return postCommentRepository
                    .findTopLevelVisibleByShareId(target.share().getId(), currentUserId, pageable)
                    .map(comment -> toCommentResponse(comment, null, currentUserId));
        }
        return postCommentRepository
                .findTopLevelVisible(target.post().getId(), currentUserId, pageable)
                .map(comment -> toCommentResponse(comment, null, currentUserId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostCommentResponse> getReplies(UUID commentId, UUID currentUserId) {
        postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        return postCommentRepository.findVisibleReplies(commentId, currentUserId)
                .stream()
                .map(comment -> toCommentResponse(comment, commentId, currentUserId))
                .toList();
    }

    @Override
    public PostCommentResponse addComment(UUID postId, CreateCommentRequest request) {
        InteractionTarget target = resolveInteractionTarget(postId);
        User user = getUser(request.getUserId(), "Comment user not found");

        if (commentViolationService.isCommentLocked(user.getId())) {
            throw new ValidationException("Bạn đang bị tạm cấm bình luận do vi phạm nhiều lần. Vui lòng thử lại sau.");
        }

        PostComment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = postCommentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found"));
            if (target.isShare()) {
                if (parentComment.getShare() == null
                        || !parentComment.getShare().getId().equals(target.share().getId())) {
                    throw new ValidationException("Parent comment does not belong to this share");
                }
            } else if (parentComment.getShare() != null
                    || !parentComment.getPost().getId().equals(target.post().getId())) {
                throw new ValidationException("Parent comment does not belong to this post");
            }
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        String imageUrl = trimToNull(request.getImageUrl());
        // Bình luận phải có nội dung HOẶC ảnh.
        if (content.isBlank() && imageUrl == null) {
            throw new ValidationException("Bình luận phải có nội dung hoặc ảnh.");
        }

        // Chỉ kiểm duyệt phần text (ảnh không qua bộ lọc keyword/AI — xem ghi chú).
        if (!content.isBlank()) {
            try {
                policyContentValidator.validateComment(content);
            } catch (ValidationException e) {
                // Ghi nhận vi phạm khi nội dung chứa từ cấm/link bị chặn (bỏ qua lỗi độ dài).
                policyContentValidator.findCommentViolationKeyword(content)
                        .ifPresent(mk -> commentViolationService.recordBlacklistViolation(
                                user.getId(), content, mk.id(), mk.value()));
                throw e;
            }
        }

        CommentStatus status = aiModerationPolicyReader.isEnabled()
                && !content.isBlank()
                ? CommentStatus.PENDING : CommentStatus.APPROVED;

        PostComment saved = postCommentRepository.save(PostComment.builder()
                .post(target.post())
                .share(target.share())
                .user(user)
                .parentComment(parentComment)
                .content(content)
                .imageUrl(imageUrl)
                .status(status)
                .build());

        userInterestService.recordInteraction(
                request.getUserId(), target.post().getId(), InterestEventType.COMMENT);

        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.COMMENT_ADDED,
                "{\"targetId\":\"" + target.getTargetId() + "\"}");

        // Hoãn notification cho comment PENDING — chỉ báo khi đã được duyệt (job nền sẽ gửi).
        if (status == CommentStatus.APPROVED) {
            publishCommentNotification(saved);
        }

        return toCommentResponse(saved, saved.getParentComment() == null ? null : saved.getParentComment().getId(), request.getUserId());
    }

    @Override
    public PostCommentResponse updateComment(UUID commentId, UUID userId, UpdateCommentRequest request) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (!comment.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa bình luận này");
        }

        User user = comment.getUser();
        if (commentViolationService.isCommentLocked(user.getId())) {
            throw new ValidationException("Bạn đang bị tạm cấm bình luận do vi phạm nhiều lần. Vui lòng thử lại sau.");
        }

        String trimmed = request.getContent().trim();
        if (trimmed.equals(comment.getContent())) {
            return toCommentResponse(comment, comment.getParentComment() == null ? null : comment.getParentComment().getId(), userId);
        }

        try {
            policyContentValidator.validateComment(request.getContent());
        } catch (ValidationException e) {
            policyContentValidator.findCommentViolationKeyword(request.getContent())
                    .ifPresent(mk -> commentViolationService.recordBlacklistViolation(
                            user.getId(), request.getContent(), mk.id(), mk.value()));
            throw e;
        }

        comment.setContent(trimmed);

        if (aiModerationPolicyReader.isEnabled() && policyContentValidator.isSuspect(request.getContent())) {
            comment.setStatus(CommentStatus.PENDING);
            comment.setModerationFailReason(null);
            comment.setModerationAttempts(0);
            comment.setAiModerationStatus(AiModerationStatus.NOT_CHECKED);
            comment.setLastModeratedAt(null);
        } else {
            comment.setStatus(CommentStatus.APPROVED);
            comment.setModerationFailReason(null);
            comment.setModerationAttempts(0);
            comment.setAiModerationStatus(AiModerationStatus.NOT_CHECKED);
            comment.setLastModeratedAt(null);
        }
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
    @Transactional
    public void likeComment(UUID commentId, UUID userId, ReactionType reactionType) {
        ReactionType type = reactionType == null ? ReactionType.LIKE : reactionType;
        // Upsert: nếu đã thả reaction thì đổi loại, chưa thì tạo mới.
        var existing = postCommentLikeRepository.findByCommentIdAndUserId(commentId, userId);
        if (existing.isPresent()) {
            existing.get().setReactionType(type);
            postCommentLikeRepository.save(existing.get());
            return;
        }
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        User user = getUser(userId, "User not found");
        postCommentLikeRepository.save(PostCommentLike.builder()
                .comment(comment)
                .user(user)
                .reactionType(type)
                .build());
    }

    @Override
    @Transactional
    public void unlikeComment(UUID commentId, UUID userId) {
        postCommentLikeRepository.deleteByCommentIdAndUserId(commentId, userId);
    }

    @Override
    @Transactional
    public PostShareResponse sharePost(UUID postId, SharePostRequest request) {
        Post post = getPost(postId);
        User user = getUser(request.getUserId(), "Share user not found");

        // Privacy guard: PRIVATE posts cannot be shared by anyone but the author
        if (post.getPrivacy() == PostPrivacy.PRIVATE && !post.getAuthor().getId().equals(user.getId())) {
            throw new ValidationException("Bạn không có quyền chia sẻ bài viết này");
        }
        // FRIENDS / FRIENDS_EXCEPT posts require an accepted friendship
        if ((post.getPrivacy() == PostPrivacy.FRIENDS || post.getPrivacy() == PostPrivacy.FRIENDS_EXCEPT)
                && !post.getAuthor().getId().equals(user.getId())) {
            boolean isFriend = friendshipRepository.findBetweenUsers(user.getId(), post.getAuthor().getId())
                    .map(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                    .orElse(false);
            if (!isFriend) {
                throw new ValidationException("Bạn không có quyền chia sẻ bài viết này");
            }
        }

        PostShare resolvedParentShare = null;
        if (request.getParentShareId() != null) {
            resolvedParentShare = postShareRepository.findById(request.getParentShareId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent share not found"));
            if (!resolvedParentShare.getPost().getId().equals(postId)) {
                throw new ValidationException("Parent share does not belong to this post");
            }
        }

        if (postShareRepository.existsByPostIdAndUserId(postId, request.getUserId())) {
            throw new ValidationException("Bạn đã chia sẻ bài viết này rồi");
        }

        PostPrivacy sharePrivacy = request.getPrivacy() != null ? request.getPrivacy() : PostPrivacy.PUBLIC;
        postShareRepository.save(PostShare.builder()
                .post(post)
                .user(user)
                .parentShare(resolvedParentShare)
                .sharedContent(trimToNull(request.getSharedContent()))
                .privacy(sharePrivacy)
                .build());

        userInterestService.recordInteraction(request.getUserId(), postId, InterestEventType.SHARE);

        activityLogService.log(user.getId(), user.getUsername(), ActivityLogType.POST_SHARED,
                "{\"postId\":\"" + postId + "\",\"parentShareId\":\"" + request.getParentShareId() + "\"}");

        notificationEventPublisher.publish(
                user.getId(),
                post.getAuthor().getId(),
                NotificationType.SHARE,
                user.getFullName() + " đã chia sẻ bài viết của bạn.",
                post.getId()
        );

        long shareCount = postShareRepository.countByPostId(postId);
        Long wrapperShareCount = request.getParentShareId() != null
                ? postShareRepository.countByParentShareId(request.getParentShareId())
                : null;
        return PostShareResponse.builder()
                .postId(postId)
                .userId(user.getId())
                .userFullName(user.getFullName())
                .shareCount(shareCount)
                .wrapperShareCount(wrapperShareCount)
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
        userInterestService.recordInteraction(request.getUserId(), request.getPostId(), InterestEventType.SAVE);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponse> getSavedPosts(UUID userId) {
        List<UUID> postIds = postSavedRepository.findPostIdsByUserId(userId); // đã sắp xếp mới-lưu-trước
        if (postIds.isEmpty()) return Collections.emptyList();
        // findAllById KHÔNG giữ thứ tự của postIds → sắp lại theo đúng thứ tự đã lưu (mới nhất lên đầu).
        Map<UUID, Post> postById = postRepository.findAllById(postIds).stream()
                .collect(Collectors.toMap(Post::getId, p -> p));
        List<Post> posts = postIds.stream()
                .map(postById::get)
                .filter(Objects::nonNull)
                .toList();
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
    public PostResponse updatePrivacy(UUID postId, UUID userId, UpdatePostPrivacyRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (!post.getAuthor().getId().equals(userId)) {
            throw new ValidationException("Bạn không có quyền chỉnh sửa bài viết này");
        }
        if (post.getGroup() != null) {
            throw new ValidationException("Không thể thay đổi quyền riêng tư bài viết trong nhóm");
        }
        if (post.getPage() != null) {
            throw new ValidationException("Không thể thay đổi quyền riêng tư bài viết trên trang");
        }

        PostPrivacy privacy = request.getPrivacy();
        assertSupportedPostPrivacy(privacy);
        if (request.getExcludedUserIds() != null && !request.getExcludedUserIds().isEmpty()) {
            throw new ValidationException("excludedUserIds is no longer supported");
        }
        if (request.getAllowedUserIds() != null && !request.getAllowedUserIds().isEmpty()) {
            throw new ValidationException("allowedUserIds is no longer supported");
        }

        post.setPrivacy(privacy);
        post.getAudienceExclusions().clear();
        post.getAudienceAllowances().clear();

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

        var analysis = geminiModerationService.analyzeReport(
                post.getContent(),
                request.getCategory() != null ? request.getCategory().name() : null,
                request.getReason()
        );

        postReportRepository.save(PostReport.builder()
                .post(post)
                .reporter(reporter)
                .reason(trimToNull(request.getReason()))
                .category(request.getCategory())
                .aiAnalysis(analysis.map(a -> a.analysis()).orElse("Không thể phân tích tự động"))
                .aiSeverity(analysis.map(a -> a.severity()).orElse("NONE"))
                .build());

        adminPostReportNotificationClient.notifyPostReport(
                reporter.getId(),
                postId,
                reporter.getUsername(),
                request.getReason()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasUserReportedPost(UUID postId, UUID userId) {
        if (postId == null || userId == null) {
            return false;
        }
        return postReportRepository.existsByPostIdAndReporterId(postId, userId);
    }

    @Override
    public void reportComment(UUID commentId, project.kconnecta.user.backend.feature.post.dto.request.ReportCommentRequest request) {
        if (request == null || request.getReporterId() == null) {
            throw new ValidationException("Reporter is required");
        }

        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        User reporter = getUser(request.getReporterId(), "Reporter not found");

        if (comment.getUser().getId().equals(reporter.getId())) {
            throw new ValidationException("Bạn không thể báo cáo bình luận của chính mình");
        }
        if (commentReportRepository.existsByCommentIdAndReporterId(commentId, reporter.getId())) {
            throw new ValidationException("Bạn đã báo cáo bình luận này");
        }

        commentReportRepository.save(project.kconnecta.user.backend.feature.post.entity.CommentReport.builder()
                .comment(comment)
                .reporter(reporter)
                .reason(trimToNull(request.getReason()))
                .category(request.getCategory())
                .status(project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus.PENDING)
                .build());

        long distinctReporters = commentReportRepository.countDistinctReportersByCommentId(commentId);

        // Report chỉ là tín hiệu — comment chỉ bị ẩn khi AI kết luận unsafe.
        if (aiModerationPolicyReader.isEnabled() && shouldRecheck(comment, distinctReporters)) {
            recheckReportedComment(comment);
        }
    }

    private boolean shouldRecheck(PostComment comment, long distinctReporters) {
        if (comment.getAiModerationStatus() == project.kconnecta.user.backend.feature.post.entity.AiModerationStatus.NOT_CHECKED) {
            return true;
        }
        if (distinctReporters >= REPORT_FORCE_RECHECK_REPORTERS) {
            return true;
        }
        LocalDateTime last = comment.getLastModeratedAt();
        if (last == null) {
            return true;
        }
        return last.isBefore(LocalDateTime.now().minus(REPORT_RECHECK_AFTER));
    }

    private void recheckReportedComment(PostComment comment) {
        var moderation = geminiModerationService.moderate(comment.getContent());
        if (moderation.isEmpty()) {
            // AI bí (hết quota/lỗi) → đẩy comment về PENDING: ẩn tạm + vào hàng đợi admin duyệt
            // (listPendingComments). Job nền mỗi phút cũng sẽ tự thử lại AI; report giữ PENDING.
            comment.setAiModerationStatus(project.kconnecta.user.backend.feature.post.entity.AiModerationStatus.FAILED);
            comment.setStatus(CommentStatus.PENDING);
            postCommentRepository.save(comment);
            return;
        }
        if (moderation.get().safe()) {
            comment.setAiModerationStatus(project.kconnecta.user.backend.feature.post.entity.AiModerationStatus.SAFE);
            comment.setLastModeratedAt(LocalDateTime.now());
            if (comment.getStatus() == CommentStatus.PENDING) {
                comment.setStatus(CommentStatus.APPROVED);
                comment.setModerationFailReason(null);
                postCommentRepository.save(comment);
                publishCommentNotification(comment);
            } else {
                postCommentRepository.save(comment);
            }
            commentReportRepository.updateStatusByCommentIdAndStatus(
                    comment.getId(), project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus.PENDING, project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus.DISMISSED);
        } else {
            comment.setStatus(CommentStatus.REJECTED);
            comment.setAiModerationStatus(project.kconnecta.user.backend.feature.post.entity.AiModerationStatus.UNSAFE);
            comment.setModerationFailReason(moderation.get().reason());
            comment.setLastModeratedAt(LocalDateTime.now());
            postCommentRepository.save(comment);
            commentReportRepository.updateStatusByCommentIdAndStatus(
                    comment.getId(), project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus.PENDING, project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus.ACTIONED);
            notificationEventPublisher.publish(
                    null,
                    comment.getUser().getId(),
                    NotificationType.SYSTEM,
                    "Cảnh báo: bình luận của bạn đã bị ẩn do vi phạm tiêu chuẩn cộng đồng. Vui lòng tuân thủ chính sách để tránh bị hạn chế.",
                    comment.getId()
            );
            log.warn("comment report reject: commentId={}, reason={}", comment.getId(), moderation.get().reason());
            try {
                commentViolationService.recordAiUnsafeViolation(
                        comment.getUser().getId(), comment.getId(), null, comment.getContent(), moderation.get().reason());
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                // Race scheduler-vs-report: thread kia đã ghi dòng AI_UNSAFE cho comment này → bỏ qua.
                log.debug("AI_UNSAFE violation already recorded for comment {} (race)", comment.getId());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<project.kconnecta.user.backend.feature.post.dto.response.PostReportResponse> getMyReports(UUID userId) {
        return postReportRepository.findByReporterIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> project.kconnecta.user.backend.feature.post.dto.response.PostReportResponse.builder()
                        .id(r.getId())
                        .postId(r.getPost().getId())
                        .reporterId(r.getReporter().getId())
                        .reporterUsername(r.getReporter().getUsername())
                        .category(r.getCategory())
                        .reason(r.getReason())
                        .status(r.getStatus())
                        .aiAnalysis(r.getAiAnalysis())
                        .aiSeverity(r.getAiSeverity())
                        .createdAt(r.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePost(UUID postId, UUID userId) {
        Optional<PostShare> shareOptional = postShareRepository.findById(postId);
        if (shareOptional.isPresent()) {
            deleteShare(shareOptional.get(), userId);
            return;
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (!post.getAuthor().getId().equals(userId)) {
            throw new ValidationException("Bạn không có quyền xóa bài viết này");
        }
        deletePostCloudinaryAssets(post);
        String username = post.getAuthor().getUsername();

        // Manual cascade deletion to avoid FK constraint violations
        entityManager.createNativeQuery("DELETE FROM post_comment_likes WHERE comment_id IN (SELECT id FROM post_comments WHERE post_id = :postId)").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM comment_violations WHERE comment_id IN (SELECT id FROM post_comments WHERE post_id = :postId)").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM comment_reports WHERE comment_id IN (SELECT id FROM post_comments WHERE post_id = :postId)").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM post_comments WHERE post_id = :postId").setParameter("postId", postId).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM post_poll_votes WHERE poll_id IN (SELECT id FROM post_polls WHERE post_id = :postId)").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM post_poll_options WHERE poll_id IN (SELECT id FROM post_polls WHERE post_id = :postId)").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM post_polls WHERE post_id = :postId").setParameter("postId", postId).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM post_reactions WHERE post_id = :postId").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM post_saved WHERE post_id = :postId").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM post_reports WHERE post_id = :postId").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM post_shares WHERE post_id = :postId").setParameter("postId", postId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM post_topics WHERE post_id = :postId").setParameter("postId", postId).executeUpdate();

        postRepository.delete(post);
        activityLogService.log(userId, username, ActivityLogType.POST_DELETED,
                "{\"postId\":\"" + postId + "\"}");
    }

    private void deletePostCloudinaryAssets(Post post) {
        Set<String> seen = new HashSet<>();
        for (PostMedia item : post.getMedia()) {
            deleteCloudinaryAssetIfOwned(item.getFileUrl(), item.getMediaType(), seen);
            deleteCloudinaryAssetIfOwned(item.getThumbnailUrl(), MediaType.IMAGE, seen);
        }

        String legacyImageUrl = post.getImageUrl();
        if (legacyImageUrl != null
                && post.getMedia().stream().noneMatch(m -> legacyImageUrl.equals(m.getFileUrl()))) {
            deleteCloudinaryAssetIfOwned(legacyImageUrl, MediaType.IMAGE, seen);
        }
    }

    private void deleteCloudinaryAssetIfOwned(String url, MediaType mediaType, Set<String> seen) {
        if (url == null) {
            return;
        }
        String trimmed = url.trim();
        if (trimmed.isBlank() || !seen.add(trimmed)) {
            return;
        }
        if (!isManagedPostMediaUrl(trimmed)) {
            return;
        }
        cloudinaryService.deleteAssetByUrlSafely(trimmed, mediaType);
    }

    private static boolean isManagedPostMediaUrl(String url) {
        return url.contains("/kconnecta/post-images/")
                || url.contains("/kconnecta/post-files/")
                || url.contains("post-media-");
    }

    private static MediaType inferMediaTypeFromUrl(String url) {
        if (url == null) {
            return MediaType.IMAGE;
        }
        if (url.contains("/raw/upload/") || url.contains("/kconnecta/post-files/")) {
            return MediaType.DOCUMENT;
        }
        if (url.contains("/video/upload/")) {
            return MediaType.VIDEO;
        }
        return MediaType.IMAGE;
    }

    private void deleteShare(PostShare share, UUID userId) {
        if (!share.getUser().getId().equals(userId)) {
            throw new ValidationException("Bạn không có quyền xóa bài viết này");
        }

        UUID shareId = share.getId();
        List<PostShare> childShares = postShareRepository.findByParentShare_Id(shareId);
        if (!childShares.isEmpty()) {
            PostShare newParent = share.getParentShare();
            childShares.forEach(child -> child.setParentShare(newParent));
            postShareRepository.saveAll(childShares);
        }

        List<PostComment> shareComments = postCommentRepository.findAllByShareId(shareId);
        if (!shareComments.isEmpty()) {
            List<UUID> commentIds = shareComments.stream().map(PostComment::getId).toList();
            postCommentLikeRepository.deleteByCommentIdIn(commentIds);
            List<PostComment> replies = shareComments.stream()
                    .filter(comment -> comment.getParentComment() != null)
                    .toList();
            List<PostComment> roots = shareComments.stream()
                    .filter(comment -> comment.getParentComment() == null)
                    .toList();
            postCommentRepository.deleteAll(replies);
            postCommentRepository.deleteAll(roots);
        }

        postReactionRepository.deleteAllByShareId(shareId);
        postShareRepository.delete(share);

        activityLogService.log(
                userId,
                share.getUser().getUsername(),
                ActivityLogType.POST_DELETED,
                "{\"shareId\":\"" + shareId + "\",\"postId\":\"" + share.getPost().getId() + "\"}"
        );
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

    private void assertSupportedPostPrivacy(PostPrivacy privacy) {
        if (privacy == PostPrivacy.FRIENDS_EXCEPT || privacy == PostPrivacy.SPECIFIC_FRIENDS) {
            throw new ValidationException("Chỉ hỗ trợ quyền riêng tư: Công khai, Bạn bè hoặc Chỉ mình tôi");
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

    private record InteractionTarget(Post post, PostShare share) {
        boolean isShare() {
            return share != null;
        }

        UUID getTargetId() {
            return isShare() ? share.getId() : post.getId();
        }
    }

    private InteractionTarget resolveInteractionTarget(UUID id) {
        return postShareRepository.findById(id)
                .map(share -> new InteractionTarget(share.getPost(), share))
                .orElseGet(() -> new InteractionTarget(getPost(id), null));
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

        Map<UUID, PostPollResponse> pollMap = buildPollResponseMap(List.of(post.getId()), currentUserId);

        return mapToResponseOptimized(post, currentUserId, reactionCounts, commentCount, shareCount, currentUserReaction, savedByCurrentUser, pollMap.get(post.getId()));
    }

    private PostResponse mapToResponseOptimized(Post post, UUID currentUserId,
                                               Map<ReactionType, Long> reactionCountsMap,
                                               long commentCount,
                                               long shareCount,
                                               ReactionType currentUserReactionType,
                                               boolean savedByCurrentUser,
                                               PostPollResponse poll) {
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

        List<UUID> allowedUserIds = post.getAudienceAllowances()
                .stream()
                .map(item -> item.getAllowedUser().getId())
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
                .pageId(post.getPage() != null ? post.getPage().getId() : null)
                .pageName(post.getPage() != null ? post.getPage().getName() : null)
                .pageAvatarUrl(post.getPage() != null ? post.getPage().getAvatarUrl() : null)
                .authorUsername(post.getAuthor().getUsername())
                .authorFullName(post.getAuthor().getFullName())
                .authorAvatarUrl(post.getAuthor().getAvatarUrl())
                .content(post.getContent())
                .imageUrl(post.getImageUrl())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .postType(post.getPostType())
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
                .allowedUserIds(allowedUserIds)
                .taggedUserIds(taggedUserIds)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .poll(poll)
                .sharedGroup(buildSharedGroupSummary(post.getSharedGroup()))
                .sharedAlbum(buildSharedAlbumSummary(post.getSharedAlbum()))
                .build();
    }

    private SharedAlbumResponse buildSharedAlbumSummary(Album album) {
        if (album == null) {
            return null;
        }
        Album resolved = albumRepository.findActiveById(album.getId()).orElse(album);
        String coverUrl = null;
        if (resolved.getCoverMediaId() != null) {
            coverUrl = albumMediaRepository.findById(resolved.getCoverMediaId())
                    .map(m -> m.getThumbnailUrl() != null ? m.getThumbnailUrl() : m.getUrl())
                    .orElse(null);
        }
        return SharedAlbumResponse.builder()
                .id(resolved.getId())
                .title(resolved.getTitle())
                .coverUrl(coverUrl)
                .mediaCount(resolved.getMediaCount())
                .ownerName(resolved.getOwner().getFullName())
                .build();
    }

    private SharedGroupResponse buildSharedGroupSummary(Group group) {
        if (group == null) return null;
        return SharedGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .coverPhotoUrl(group.getCoverPhotoUrl())
                .privacy(group.getPrivacy())
                .memberCount(groupMemberRepository.countByGroupId(group.getId()))
                .build();
    }

    private Map<ReactionType, Long> buildReactionCountsMap(UUID postId) {
        return postReactionRepository.findReactionCountsByPostId(postId).stream()
                .collect(Collectors.toMap(
                        PostReactionRepository.ReactionCountProjection::getReactionType,
                        PostReactionRepository.ReactionCountProjection::getCount
                ));
    }

    /**
     * Converts a batch of PostShare records into PostResponse "share wrapper" objects.
     * Each wrapper uses the sharer as author, shareTime as createdAt, and embeds the
     * original PostResponse so the frontend can render a post-in-post card.
     */
    private List<PostResponse> toShareWrappers(List<PostShare> shares, UUID currentUserId) {
        if (shares.isEmpty()) return Collections.emptyList();

        List<Post> uniqueOriginalPosts = shares.stream()
                .map(PostShare::getPost)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Post::getId, post -> post, (left, right) -> left))
                .values()
                .stream()
                .toList();
        List<PostResponse> originals = processPostsBulk(uniqueOriginalPosts, currentUserId);
        Map<UUID, PostResponse> byPostId = originals.stream()
                .collect(Collectors.toMap(PostResponse::getId, r -> r, (left, right) -> left));

        List<UUID> shareIds = shares.stream().map(PostShare::getId).toList();
        Map<UUID, Long> shareCommentCounts = postCommentRepository.countByShareIdIn(shareIds).stream()
                .collect(Collectors.toMap(PostCommentRepository.ShareCountProjection::getShareId, PostCommentRepository.ShareCountProjection::getCount));
        Map<UUID, Map<ReactionType, Long>> shareReactionCounts = postReactionRepository.findReactionCountsByShareIds(shareIds).stream()
                .collect(Collectors.groupingBy(
                        PostReactionRepository.ShareReactionCountProjection::getShareId,
                        Collectors.toMap(
                                PostReactionRepository.ShareReactionCountProjection::getReactionType,
                                PostReactionRepository.ShareReactionCountProjection::getCount
                        )
                ));
        Map<UUID, ReactionType> userShareReactions = currentUserId == null
                ? Collections.emptyMap()
                : postReactionRepository.findAllByUserIdAndShareIdIn(currentUserId, shareIds).stream()
                        .collect(Collectors.toMap(r -> r.getShare().getId(), PostReaction::getReactionType));
        Map<UUID, Long> wrapperShareCounts = shareIds.isEmpty()
                ? Collections.emptyMap()
                : postShareRepository.countByParentShareIdIn(shareIds).stream()
                        .collect(Collectors.toMap(PostShareRepository.ParentShareCountProjection::getParentShareId, PostShareRepository.ParentShareCountProjection::getCount));

        return shares.stream()
                .map(share -> {
                    PostResponse original = byPostId.get(share.getPost().getId());
                    if (original == null) return null;
                    User sharer = share.getUser();
                    Map<ReactionType, Long> reactionMap = shareReactionCounts.getOrDefault(share.getId(), Collections.emptyMap());
                    List<PostReactionCountResponse> reactionCounts = Arrays.stream(ReactionType.values())
                            .map(reactionType -> PostReactionCountResponse.builder()
                                    .reactionType(reactionType)
                                    .count(reactionMap.getOrDefault(reactionType, 0L))
                                    .build())
                            .toList();
                    long reactionTotal = reactionCounts.stream().mapToLong(PostReactionCountResponse::getCount).sum();
                    long commentCount = shareCommentCounts.getOrDefault(share.getId(), 0L);
                    ReactionType currentUserReaction = userShareReactions.get(share.getId());
                    return PostResponse.builder()
                            .id(share.getId())
                            .authorId(sharer.getId())
                            .authorUsername(sharer.getUsername())
                            .authorFullName(sharer.getFullName())
                            .authorAvatarUrl(sharer.getAvatarUrl())
                            .content(share.getSharedContent())
                            .createdAt(share.getCreatedAt())
                            .updatedAt(share.getCreatedAt())
                            .publishedAt(share.getCreatedAt())
                            .privacy(share.getPrivacy() != null ? share.getPrivacy() : PostPrivacy.PUBLIC)
                            .status(PostStatus.PUBLISHED)
                            .reactionCount(reactionTotal)
                            .reactionCounts(reactionCounts)
                            .currentUserReactionType(currentUserReaction)
                            .savedByCurrentUser(original.isSavedByCurrentUser())
                            .commentCount(commentCount)
                            .shareCount(wrapperShareCounts.getOrDefault(share.getId(), 0L))
                            .media(Collections.emptyList())
                            .excludedUserIds(Collections.emptyList())
                            .taggedUserIds(Collections.emptyList())
                            .sharedPost(true)
                            .originalPost(original)
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public PostPollResponse votePoll(UUID postId, UUID userId, VotePostPollRequest request) {
        if (request == null || request.getOptionId() == null) {
            throw new ValidationException("optionId is required");
        }
        Post post = getPost(postId);
        PostPoll poll = postPollRepository.findByPostId(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found for this post"));
        requireApprovedGroupMember(post, userId);

        PostPollOption option = postPollOptionRepository.findById(request.getOptionId())
                .orElseThrow(() -> new ResourceNotFoundException("Poll option not found"));
        if (!option.getPoll().getId().equals(poll.getId())) {
            throw new ValidationException("Invalid poll option");
        }

        User user = getUser(userId, "User not found");
        if (!poll.isAllowMultiple()) {
            postPollVoteRepository.deleteAllByPollIdAndUserId(poll.getId(), userId);
            postPollVoteRepository.save(PostPollVote.builder()
                    .poll(poll)
                    .option(option)
                    .user(user)
                    .build());
        } else {
            postPollVoteRepository.findByPollIdAndUserIdAndOptionId(poll.getId(), userId, option.getId())
                    .ifPresentOrElse(
                            postPollVoteRepository::delete,
                            () -> postPollVoteRepository.save(PostPollVote.builder()
                                    .poll(poll)
                                    .option(option)
                                    .user(user)
                                    .build())
                    );
        }

        return buildPollResponse(poll, userId);
    }

    @Override
    public PostPollResponse addPollOption(UUID postId, UUID userId, AddPostPollOptionRequest request) {
        if (request == null || trimToNull(request.getText()) == null) {
            throw new ValidationException("Option text is required");
        }
        Post post = getPost(postId);
        PostPoll poll = postPollRepository.findByPostId(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found for this post"));
        if (!poll.isAllowAddOptions()) {
            throw new ValidationException("Adding options is not allowed for this poll");
        }
        requireApprovedGroupMember(post, userId);

        List<PostPollOption> existing = postPollOptionRepository.findAllByPollIdOrderBySortOrderAsc(poll.getId());
        if (existing.size() >= 10) {
            throw new ValidationException("Poll cannot have more than 10 options");
        }

        User user = getUser(userId, "User not found");
        int nextOrder = existing.isEmpty() ? 0 : existing.get(existing.size() - 1).getSortOrder() + 1;
        postPollOptionRepository.save(PostPollOption.builder()
                .poll(poll)
                .text(request.getText().trim())
                .sortOrder(nextOrder)
                .addedBy(user)
                .build());

        return buildPollResponse(poll, userId);
    }

    @Override
    public PostPollResponse deletePollOption(UUID postId, UUID optionId, UUID userId) {
        Post post = getPost(postId);
        PostPoll poll = postPollRepository.findByPostId(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll not found for this post"));
        requireApprovedGroupMember(post, userId);

        boolean isAuthor = post.getAuthor().getId().equals(userId);
        boolean isAdmin = post.getGroup() != null && groupMemberRepository.findByGroupIdAndUserId(post.getGroup().getId(), userId)
                .map(member -> member.getRole() == GroupMemberRole.ADMIN
                        && member.getStatus() == GroupMemberStatus.APPROVED)
                .orElse(false);
        if (!isAuthor && !isAdmin) {
            throw new ValidationException("Bạn không có quyền xóa lựa chọn này");
        }

        PostPollOption option = postPollOptionRepository.findById(optionId)
                .orElseThrow(() -> new ResourceNotFoundException("Poll option not found"));
        if (!option.getPoll().getId().equals(poll.getId())) {
            throw new ValidationException("Invalid poll option");
        }

        long optionCount = postPollOptionRepository.findAllByPollIdOrderBySortOrderAsc(poll.getId()).size();
        if (optionCount <= 2) {
            throw new ValidationException("Cuộc thăm dò ý kiến cần ít nhất 2 lựa chọn");
        }

        postPollOptionRepository.delete(option);
        return buildPollResponse(poll, userId);
    }

    private void attachPoll(Post post, User author, CreatePostPollRequest pollRequest) {
        List<String> options = normalizePollOptions(pollRequest.getOptions());
        PostPoll poll = PostPoll.builder()
                .post(post)
                .allowMultiple(Boolean.TRUE.equals(pollRequest.getAllowMultiple()))
                .allowAddOptions(pollRequest.getAllowAddOptions() == null || pollRequest.getAllowAddOptions())
                .build();

        for (int i = 0; i < options.size(); i++) {
            poll.getOptions().add(PostPollOption.builder()
                    .poll(poll)
                    .text(options.get(i))
                    .sortOrder(i)
                    .addedBy(author)
                    .build());
        }
        postPollRepository.save(poll);
    }

    private List<String> normalizePollOptions(List<String> rawOptions) {
        if (rawOptions == null) {
            return Collections.emptyList();
        }
        return rawOptions.stream()
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .toList();
    }

    private Map<UUID, PostPollResponse> buildPollResponseMap(List<UUID> postIds, UUID currentUserId) {
        if (postIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<PostPoll> polls = postPollRepository.findAllByPostIdIn(postIds);
        if (polls.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<UUID, PostPollResponse> result = new HashMap<>();
        for (PostPoll poll : polls) {
            UUID postId = poll.getPost().getId();
            result.put(postId, buildPollResponse(poll, currentUserId));
        }
        return result;
    }

    private PostPollResponse buildPollResponse(PostPoll poll, UUID currentUserId) {
        List<PostPollOption> options = postPollOptionRepository.findAllByPollIdOrderBySortOrderAsc(poll.getId());
        Map<UUID, Long> voteCounts = postPollVoteRepository.countVotesByPollId(poll.getId()).stream()
                .collect(Collectors.toMap(
                        PostPollVoteRepository.OptionVoteCountProjection::getOptionId,
                        PostPollVoteRepository.OptionVoteCountProjection::getCount
                ));

        long totalVotes = voteCounts.values().stream().mapToLong(Long::longValue).sum();
        List<UUID> myVotedOptionIds = currentUserId == null
                ? Collections.emptyList()
                : postPollVoteRepository.findAllByPollIdAndUserId(poll.getId(), currentUserId).stream()
                        .map(vote -> vote.getOption().getId())
                        .toList();

        List<PostPollOptionResponse> optionResponses = options.stream()
                .map(option -> {
                    long count = voteCounts.getOrDefault(option.getId(), 0L);
                    int percentage = totalVotes == 0 ? 0 : (int) Math.round((count * 100.0) / totalVotes);
                    return PostPollOptionResponse.builder()
                            .id(option.getId())
                            .text(option.getText())
                            .sortOrder(option.getSortOrder())
                            .voteCount(count)
                            .percentage(percentage)
                            .build();
                })
                .toList();

        return PostPollResponse.builder()
                .id(poll.getId())
                .allowMultiple(poll.isAllowMultiple())
                .allowAddOptions(poll.isAllowAddOptions())
                .options(optionResponses)
                .myVotedOptionIds(myVotedOptionIds)
                .totalVotes(totalVotes)
                .build();
    }

    private void requireApprovedGroupMember(Post post, UUID userId) {
        if (post.getGroup() == null) {
            throw new ValidationException("Poll is only available on group posts");
        }
        boolean isMember = groupMemberRepository.findByGroupIdAndUserId(post.getGroup().getId(), userId)
                .map(member -> member.getStatus() == GroupMemberStatus.APPROVED)
                .orElse(false);
        if (!isMember) {
            throw new ValidationException("Only approved group members can interact with polls");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Override
    public ContentVerificationResponse verifyPostContent(String content) {
        if (content == null || content.isBlank()) {
            return ContentVerificationResponse.builder()
                    .safe(true)
                    .level("NONE")
                    .build();
        }

        // 1. Kiểm tra từ khóa trong blacklist / watchlist
        var matchedOpt = policyContentValidator.findAnyMatchedKeyword(content);
        if (matchedOpt.isPresent()) {
            var matched = matchedOpt.get();
            String cat = matched.category();
            if ("blacklist".equalsIgnoreCase(cat) || "banned".equalsIgnoreCase(cat)) {
                return ContentVerificationResponse.builder()
                        .safe(false)
                        .level("BLACKLIST")
                        .matchedKeyword(matched.value())
                        .reason("Nội dung chứa từ khóa bị cấm: \"" + matched.value() + "\"")
                        .build();
            } else if ("watchlist".equalsIgnoreCase(cat) || "sensitive".equalsIgnoreCase(cat)) {
                return ContentVerificationResponse.builder()
                        .safe(true) // Watchlist vẫn cho qua để đăng, nhưng cảnh báo để AI quét tiếp
                        .level("WATCHLIST")
                        .matchedKeyword(matched.value())
                        .reason("Nội dung chứa từ nhạy cảm: \"" + matched.value() + "\"")
                        .build();
            }
        }

        // 2. Kiểm tra bằng AI (nếu AI bật)
        if (aiModerationPolicyReader.isEnabled()) {
            var moderationOpt = geminiModerationService.moderate(content);
            if (moderationOpt.isPresent() && !moderationOpt.get().safe()) {
                return ContentVerificationResponse.builder()
                        .safe(false)
                        .level("AI_UNSAFE")
                        .reason("Nội dung vi phạm tiêu chuẩn cộng đồng: " + moderationOpt.get().reason())
                        .build();
            }
        }

        return ContentVerificationResponse.builder()
                .safe(true)
                .level("NONE")
                .build();
    }

    private void validateReelMedia(List<CreatePostMediaRequest> mediaRequests) {
        long videoCount = mediaRequests.stream().filter(m -> m.getMediaType() == MediaType.VIDEO).count();
        long imageCount = mediaRequests.stream().filter(m -> m.getMediaType() == MediaType.IMAGE).count();
        if (mediaRequests.isEmpty() || videoCount != 1) {
            throw new ValidationException("Reel must include exactly one video");
        }
        if (imageCount > 0) {
            throw new ValidationException("Reels cannot include images");
        }
    }
}
