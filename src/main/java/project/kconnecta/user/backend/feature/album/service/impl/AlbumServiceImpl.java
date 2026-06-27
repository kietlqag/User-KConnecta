package project.kconnecta.user.backend.feature.album.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.common.util.MediaFileSniffer;
import project.kconnecta.user.backend.feature.album.dto.request.*;
import project.kconnecta.user.backend.feature.album.dto.response.*;
import project.kconnecta.user.backend.feature.album.entity.*;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumMediaType;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumType;
import project.kconnecta.user.backend.feature.album.repository.*;
import project.kconnecta.user.backend.feature.album.service.AlbumPermissionService;
import project.kconnecta.user.backend.feature.album.service.AlbumService;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionCountResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionUserResponse;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.service.PostService;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AlbumServiceImpl implements AlbumService {

    private static final int SIDEBAR_LIMIT = 4;
    private static final Set<String> ALBUM_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");
    private static final Set<String> ALBUM_VIDEO_EXTENSIONS = Set.of("mp4", "mov", "webm");

    private final AlbumRepository albumRepository;
    private final AlbumMediaRepository albumMediaRepository;
    private final AlbumCommentRepository albumCommentRepository;
    private final AlbumMediaCommentRepository albumMediaCommentRepository;
    private final AlbumReactionRepository albumReactionRepository;
    private final AlbumMediaReactionRepository albumMediaReactionRepository;
    private final AlbumShareRepository albumShareRepository;
    private final AlbumReportRepository albumReportRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final CloudinaryService cloudinaryService;
    private final AlbumPermissionService albumPermissionService;
    private final PostService postService;
    private final NotificationEventPublisher notificationEventPublisher;

    @Override
    public AlbumResponse createAlbum(UUID userId, CreateAlbumRequest request) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Group group = null;
        if (request.getGroupId() != null) {
            group = groupRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
            boolean isMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), userId)
                    .map(m -> m.getStatus() == GroupMemberStatus.APPROVED)
                    .orElse(false);
            if (!isMember) {
                throw new ValidationException("You must be an approved group member to create a group album");
            }
        }

        Album album = Album.builder()
                .owner(owner)
                .group(group)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .albumType(request.getAlbumType() != null ? request.getAlbumType() : AlbumType.PERSONAL)
                .privacy(request.getPrivacy() != null ? request.getPrivacy() : AlbumPrivacy.PUBLIC)
                .status(AlbumStatus.ACTIVE)
                .mediaCount(0)
                .build();

        album = albumRepository.save(album);
        return mapAlbum(album, userId, false);
    }

    @Override
    public AlbumResponse updateAlbum(UUID userId, UUID albumId, UpdateAlbumRequest request) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireEdit(userId, album);

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            album.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            album.setDescription(request.getDescription());
        }
        if (request.getAlbumType() != null) {
            album.setAlbumType(request.getAlbumType());
        }
        if (request.getPrivacy() != null) {
            album.setPrivacy(request.getPrivacy());
        }
        if (request.getStatus() != null && request.getStatus() != AlbumStatus.DELETED) {
            album.setStatus(request.getStatus());
        }

        album = albumRepository.save(album);
        return mapAlbum(album, userId, false);
    }

    @Override
    public void deleteAlbum(UUID userId, UUID albumId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireEdit(userId, album);
        album.setStatus(AlbumStatus.DELETED);
        albumRepository.save(album);
    }

    @Override
    @Transactional(readOnly = true)
    public AlbumResponse getAlbum(UUID viewerId, UUID albumId, boolean includeMedia) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(viewerId, album);
        return mapAlbum(album, viewerId, includeMedia);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlbumResponse> getMyAlbums(UUID userId, Pageable pageable) {
        return albumRepository.findByOwnerIdAndStatus(userId, AlbumStatus.ACTIVE, pageable)
                .map(a -> mapAlbum(a, userId, false));
    }

    @Override
    public void reorderMyAlbums(UUID userId, ReorderAlbumsRequest request) {
        List<UUID> albumIds = request.getAlbumIds();
        if (albumIds == null || albumIds.isEmpty()) {
            return;
        }

        for (UUID albumId : albumIds) {
            Album album = loadAlbum(albumId);
            albumPermissionService.requireEdit(userId, album);
        }

        java.time.LocalDateTime base = java.time.LocalDateTime.now();
        for (int i = 0; i < albumIds.size(); i++) {
            albumRepository.updateUpdatedAt(
                    albumIds.get(i),
                    userId,
                    base.minusNanos((long) i * 1_000_000L));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlbumSidebarItemResponse> getSidebarAlbums(UUID userId) {
        return albumRepository.findSidebarByOwnerId(userId, PageRequest.of(0, SIDEBAR_LIMIT))
                .stream()
                .map(this::mapSidebarItem)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlbumResponse> getUserAlbums(UUID viewerId, UUID ownerId, Pageable pageable) {
        List<Album> albums = albumRepository
                .findPersonalByOwnerId(ownerId, org.springframework.data.domain.Pageable.unpaged())
                .getContent();

        List<AlbumResponse> viewable = albums.stream()
                .filter(a -> albumPermissionService.canView(viewerId, a))
                .map(a -> mapAlbum(a, viewerId, false))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), viewable.size());
        List<AlbumResponse> page = start >= viewable.size()
                ? java.util.Collections.emptyList()
                : viewable.subList(start, end);

        return new org.springframework.data.domain.PageImpl<>(page, pageable, viewable.size());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlbumResponse> getGroupAlbums(UUID viewerId, UUID groupId, Pageable pageable) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        Page<Album> page = albumRepository.findByGroupId(groupId, pageable);
        List<AlbumResponse> filtered = page.getContent().stream()
                .filter(a -> albumPermissionService.canView(viewerId, a))
                .map(a -> mapAlbum(a, viewerId, false))
                .toList();
        return new org.springframework.data.domain.PageImpl<>(filtered, pageable, page.getTotalElements());
    }

    @Override
    public AlbumMediaResponse uploadMedia(UUID userId, UUID albumId, MultipartFile file, String caption) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Media file is required");
        }

        Album album = loadAlbum(albumId);
        albumPermissionService.requireEdit(userId, album);

        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String sniffedExt = MediaFileSniffer.sniffExtension(file);
        AlbumMediaType mediaType;
        if (ALBUM_IMAGE_EXTENSIONS.contains(sniffedExt)) {
            mediaType = AlbumMediaType.IMAGE;
        } else if (ALBUM_VIDEO_EXTENSIONS.contains(sniffedExt)) {
            mediaType = AlbumMediaType.VIDEO;
        } else {
            throw new ValidationException("Unsupported media type. Only images and videos are allowed.");
        }

        String url = cloudinaryService.uploadAlbumMedia(file, mediaType.name());
        int nextOrder = albumMediaRepository.findMaxSortOrder(albumId) + 1;

        AlbumMedia media = AlbumMedia.builder()
                .album(album)
                .uploader(uploader)
                .mediaType(mediaType)
                .url(url)
                .thumbnailUrl(mediaType == AlbumMediaType.VIDEO ? url : null)
                .caption(caption)
                .sortOrder(nextOrder)
                .build();

        media = albumMediaRepository.save(media);
        refreshMediaCount(album);
        if (album.getCoverMediaId() == null) {
            album.setCoverMediaId(media.getId());
            albumRepository.save(album);
        }

        return mapMedia(media, userId);
    }

    @Override
    public void deleteMedia(UUID userId, UUID albumId, UUID mediaId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireEdit(userId, album);

        AlbumMedia media = albumMediaRepository.findByIdAndAlbumId(mediaId, albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));

        albumMediaRepository.delete(media);
        if (Objects.equals(album.getCoverMediaId(), mediaId)) {
            albumMediaRepository.findAllByAlbumIdOrderBySortOrder(albumId).stream()
                    .findFirst()
                    .ifPresentOrElse(
                            m -> album.setCoverMediaId(m.getId()),
                            () -> album.setCoverMediaId(null)
                    );
        }
        refreshMediaCount(album);
        albumRepository.save(album);
    }

    @Override
    public void reorderMedia(UUID userId, UUID albumId, ReorderAlbumMediaRequest request) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireEdit(userId, album);

        List<AlbumMedia> existing = albumMediaRepository.findAllByAlbumIdOrderBySortOrder(albumId);
        Map<UUID, AlbumMedia> byId = existing.stream()
                .collect(Collectors.toMap(AlbumMedia::getId, m -> m));

        if (request.getMediaIds().size() != existing.size()
                || !byId.keySet().containsAll(request.getMediaIds())) {
            throw new ValidationException("Invalid media order");
        }

        int order = 0;
        for (UUID mediaId : request.getMediaIds()) {
            AlbumMedia media = byId.get(mediaId);
            media.setSortOrder(order++);
            albumMediaRepository.save(media);
        }
        album.setUpdatedAt(java.time.LocalDateTime.now());
        albumRepository.save(album);
    }

    @Override
    public void setCover(UUID userId, UUID albumId, SetAlbumCoverRequest request) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireEdit(userId, album);

        albumMediaRepository.findByIdAndAlbumId(request.getMediaId(), albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));

        album.setCoverMediaId(request.getMediaId());
        albumRepository.save(album);
    }

    @Override
    public AlbumCommentResponse addAlbumComment(UUID userId, UUID albumId, CreateAlbumCommentRequest request) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        AlbumComment comment = AlbumComment.builder()
                .album(album)
                .user(user)
                .content(request.getContent().trim())
                .parentId(request.getParentId())
                .build();

        comment = albumCommentRepository.save(comment);
        if (!album.getOwner().getId().equals(userId)) {
            notificationEventPublisher.publish(
                    userId,
                    album.getOwner().getId(),
                    NotificationType.COMMENT,
                    user.getFullName() + " đã bình luận về album \"" + album.getTitle() + "\"",
                    album.getId()
            );
        }
        return mapComment(comment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlbumCommentResponse> getAlbumComments(UUID viewerId, UUID albumId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(viewerId, album);
        return albumCommentRepository.findTopLevelByAlbumId(albumId).stream()
                .map(this::mapComment)
                .toList();
    }

    @Override
    public void addAlbumReaction(UUID userId, UUID albumId, ReactionType reactionType) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        AlbumReaction reaction = albumReactionRepository.findByAlbumIdAndUserId(albumId, userId)
                .orElse(null);
        boolean isNewReaction = reaction == null;
        if (isNewReaction) {
            reaction = AlbumReaction.builder().album(album).user(user).build();
        }
        reaction.setReactionType(reactionType);
        albumReactionRepository.save(reaction);

        if (isNewReaction && !album.getOwner().getId().equals(userId)) {
            notificationEventPublisher.publish(
                    userId,
                    album.getOwner().getId(),
                    NotificationType.LIKE,
                    user.getFullName() + " đã bày tỏ cảm xúc về album \"" + album.getTitle() + "\"",
                    album.getId()
            );
        }
    }

    @Override
    public void removeAlbumReaction(UUID userId, UUID albumId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);
        albumReactionRepository.findByAlbumIdAndUserId(albumId, userId)
                .ifPresent(albumReactionRepository::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public AlbumReactionDetailsResponse getAlbumReactionDetails(UUID viewerId, UUID albumId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(viewerId, album);

        List<AlbumReaction> reactions = albumReactionRepository.findAllByAlbumIdOrderByCreatedAtDesc(albumId);

        Map<ReactionType, Long> countByType = reactions.stream()
                .collect(Collectors.groupingBy(AlbumReaction::getReactionType, Collectors.counting()));

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

        return AlbumReactionDetailsResponse.builder()
                .albumId(albumId)
                .totalCount(reactions.size())
                .counts(counts)
                .reactions(users)
                .build();
    }

    @Override
    public AlbumCommentResponse addMediaComment(UUID userId, UUID albumId, UUID mediaId, CreateAlbumCommentRequest request) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);

        AlbumMedia media = albumMediaRepository.findByIdAndAlbumId(mediaId, albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        AlbumMediaComment comment = AlbumMediaComment.builder()
                .media(media)
                .user(user)
                .content(request.getContent().trim())
                .parentId(request.getParentId())
                .build();

        comment = albumMediaCommentRepository.save(comment);
        if (media.getUploader() != null && !media.getUploader().getId().equals(userId)) {
            notificationEventPublisher.publish(
                    userId,
                    media.getUploader().getId(),
                    NotificationType.COMMENT,
                    user.getFullName() + " đã bình luận về ảnh trong album \"" + album.getTitle() + "\"",
                    album.getId()
            );
        } else if (!album.getOwner().getId().equals(userId)) {
            notificationEventPublisher.publish(
                    userId,
                    album.getOwner().getId(),
                    NotificationType.COMMENT,
                    user.getFullName() + " đã bình luận về ảnh trong album \"" + album.getTitle() + "\"",
                    album.getId()
            );
        }
        return mapMediaComment(comment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlbumCommentResponse> getMediaComments(UUID viewerId, UUID albumId, UUID mediaId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(viewerId, album);
        albumMediaRepository.findByIdAndAlbumId(mediaId, albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));
        return albumMediaCommentRepository.findTopLevelByMediaId(mediaId).stream()
                .map(this::mapMediaComment)
                .toList();
    }

    @Override
    public void addMediaReaction(UUID userId, UUID albumId, UUID mediaId, ReactionType reactionType) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);

        AlbumMedia media = albumMediaRepository.findByIdAndAlbumId(mediaId, albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        AlbumMediaReaction reaction = albumMediaReactionRepository.findByMediaIdAndUserId(mediaId, userId)
                .orElse(AlbumMediaReaction.builder().media(media).user(user).build());
        reaction.setReactionType(reactionType);
        albumMediaReactionRepository.save(reaction);
    }

    @Override
    public void removeMediaReaction(UUID userId, UUID albumId, UUID mediaId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);
        albumMediaRepository.findByIdAndAlbumId(mediaId, albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found"));
        albumMediaReactionRepository.findByMediaIdAndUserId(mediaId, userId)
                .ifPresent(albumMediaReactionRepository::delete);
    }

    @Override
    public ShareAlbumResponse shareAlbum(UUID userId, UUID albumId, ShareAlbumRequest request) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        AlbumShare share = AlbumShare.builder()
                .album(album)
                .user(user)
                .message(request.getMessage())
                .build();
        share = albumShareRepository.save(share);

        UUID postId = null;
        if (request.isShareToFeed()) {
            String coverUrl = resolveCoverUrl(album);
            String defaultMessage = user.getFullName() + " đã chia sẻ album \"" + album.getTitle() + "\"";
            CreatePostRequest postRequest = new CreatePostRequest();
            postRequest.setAuthorId(userId);
            postRequest.setContent(request.getMessage() != null && !request.getMessage().isBlank()
                    ? request.getMessage().trim()
                    : defaultMessage);
            postRequest.setSharedAlbumId(albumId);
            postRequest.setImageUrl(coverUrl);
            postRequest.setPrivacy(PostPrivacy.PUBLIC);
            postRequest.setStatus(PostStatus.PUBLISHED);
            if (album.getGroup() != null) {
                postRequest.setGroupId(album.getGroup().getId());
            }
            postId = postService.createPost(postRequest).getId();
        }

        if (!album.getOwner().getId().equals(userId)) {
            notificationEventPublisher.publish(
                    userId,
                    album.getOwner().getId(),
                    NotificationType.SHARE,
                    user.getFullName() + " đã chia sẻ album \"" + album.getTitle() + "\"",
                    album.getId()
            );
        }

        return ShareAlbumResponse.builder()
                .id(share.getId())
                .postId(postId)
                .build();
    }

    @Override
    public void sendAlbumToUser(UUID senderId, UUID albumId, UUID recipientId) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(senderId, album);

        if (recipientId.equals(senderId)) {
            return;
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));

        notificationEventPublisher.publish(
                senderId,
                recipientId,
                NotificationType.SHARE,
                sender.getFullName() + " đã gửi cho bạn album \"" + album.getTitle() + "\"",
                album.getId()
        );
    }

    @Override
    public void reportAlbum(UUID userId, UUID albumId, ReportAlbumRequest request) {
        Album album = loadAlbum(albumId);
        albumPermissionService.requireView(userId, album);

        if (albumReportRepository.existsByAlbumIdAndReporterId(albumId, userId)) {
            throw new DuplicateResourceException("You have already reported this album");
        }

        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        AlbumReport report = AlbumReport.builder()
                .album(album)
                .reporter(reporter)
                .reason(request.getReason())
                .detail(request.getDetail())
                .build();
        albumReportRepository.save(report);
    }

    private Album loadAlbum(UUID albumId) {
        return albumRepository.findActiveById(albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Album not found"));
    }

    private void refreshMediaCount(Album album) {
        int count = albumMediaRepository.countByAlbumId(album.getId());
        album.setMediaCount(count);
        albumRepository.save(album);
    }

    private AlbumSidebarItemResponse mapSidebarItem(Album album) {
        String coverUrl = resolveCoverUrl(album);
        return AlbumSidebarItemResponse.builder()
                .id(album.getId())
                .title(album.getTitle())
                .coverUrl(coverUrl)
                .mediaCount(album.getMediaCount())
                .updatedAt(album.getUpdatedAt())
                .build();
    }

    private AlbumResponse mapAlbum(Album album, UUID viewerId, boolean includeMedia) {
        String coverUrl = resolveCoverUrl(album);
        long reactionCount = albumReactionRepository.countByAlbumId(album.getId());
        long commentCount = albumCommentRepository.countByAlbumId(album.getId());
        String viewerReaction = viewerId != null
                ? albumReactionRepository.findByAlbumIdAndUserId(album.getId(), viewerId)
                .map(r -> r.getReactionType().name())
                .orElse(null)
                : null;

        List<AlbumMediaResponse> media = includeMedia
                ? albumMediaRepository.findAllByAlbumIdOrderBySortOrder(album.getId()).stream()
                .map(m -> mapMedia(m, viewerId))
                .toList()
                : null;

        return AlbumResponse.builder()
                .id(album.getId())
                .title(album.getTitle())
                .description(album.getDescription())
                .albumType(album.getAlbumType())
                .privacy(album.getPrivacy())
                .status(album.getStatus())
                .ownerId(album.getOwner().getId())
                .ownerName(album.getOwner().getFullName())
                .ownerAvatarUrl(album.getOwner().getAvatarUrl())
                .groupId(album.getGroup() != null ? album.getGroup().getId() : null)
                .groupName(album.getGroup() != null ? album.getGroup().getName() : null)
                .coverMediaId(album.getCoverMediaId())
                .coverUrl(coverUrl)
                .mediaCount(album.getMediaCount())
                .reactionCount(reactionCount)
                .commentCount(commentCount)
                .viewerReaction(viewerReaction)
                .canEdit(viewerId != null && albumPermissionService.canEdit(viewerId, album))
                .createdAt(album.getCreatedAt())
                .updatedAt(album.getUpdatedAt())
                .media(media)
                .build();
    }

    private String resolveCoverUrl(Album album) {
        if (album.getCoverMediaId() == null) {
            return null;
        }
        return albumMediaRepository.findById(album.getCoverMediaId())
                .map(m -> m.getThumbnailUrl() != null ? m.getThumbnailUrl() : m.getUrl())
                .orElse(null);
    }

    private AlbumMediaResponse mapMedia(AlbumMedia media, UUID viewerId) {
        long reactionCount = albumMediaReactionRepository.countByMediaId(media.getId());
        String viewerReaction = viewerId != null
                ? albumMediaReactionRepository.findByMediaIdAndUserId(media.getId(), viewerId)
                .map(r -> r.getReactionType().name())
                .orElse(null)
                : null;

        return AlbumMediaResponse.builder()
                .id(media.getId())
                .mediaType(media.getMediaType())
                .url(media.getUrl())
                .thumbnailUrl(media.getThumbnailUrl())
                .caption(media.getCaption())
                .sortOrder(media.getSortOrder())
                .width(media.getWidth())
                .height(media.getHeight())
                .durationSeconds(media.getDurationSeconds())
                .uploaderId(media.getUploader() != null ? media.getUploader().getId() : null)
                .uploaderName(media.getUploader() != null ? media.getUploader().getFullName() : null)
                .createdAt(media.getCreatedAt())
                .reactionCount(reactionCount)
                .viewerReaction(viewerReaction)
                .build();
    }

    private AlbumCommentResponse mapComment(AlbumComment comment) {
        return AlbumCommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUser().getId())
                .userName(comment.getUser().getFullName())
                .userAvatarUrl(comment.getUser().getAvatarUrl())
                .content(comment.getContent())
                .parentId(comment.getParentId())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    private AlbumCommentResponse mapMediaComment(AlbumMediaComment comment) {
        return AlbumCommentResponse.builder()
                .id(comment.getId())
                .userId(comment.getUser().getId())
                .userName(comment.getUser().getFullName())
                .userAvatarUrl(comment.getUser().getAvatarUrl())
                .content(comment.getContent())
                .parentId(comment.getParentId())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
