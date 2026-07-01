package project.kconnecta.user.backend.feature.album.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.album.dto.request.*;
import project.kconnecta.user.backend.feature.album.dto.response.*;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;

import java.util.List;
import java.util.UUID;

public interface AlbumService {

    AlbumResponse createAlbum(UUID userId, CreateAlbumRequest request);

    AlbumResponse updateAlbum(UUID userId, UUID albumId, UpdateAlbumRequest request);

    void deleteAlbum(UUID userId, UUID albumId);

    AlbumResponse getAlbum(UUID viewerId, UUID albumId, boolean includeMedia);

    Page<AlbumResponse> getMyAlbums(UUID userId, Pageable pageable);

    void reorderMyAlbums(UUID userId, ReorderAlbumsRequest request);

    List<AlbumSidebarItemResponse> getSidebarAlbums(UUID userId);

    Page<AlbumResponse> getUserAlbums(UUID viewerId, UUID ownerId, Pageable pageable);

    AlbumMediaResponse uploadMedia(UUID userId, UUID albumId, MultipartFile file, String caption);

    void deleteMedia(UUID userId, UUID albumId, UUID mediaId);

    void reorderMedia(UUID userId, UUID albumId, ReorderAlbumMediaRequest request);

    void setCover(UUID userId, UUID albumId, SetAlbumCoverRequest request);

    AlbumCommentResponse addAlbumComment(UUID userId, UUID albumId, CreateAlbumCommentRequest request);

    List<AlbumCommentResponse> getAlbumComments(UUID viewerId, UUID albumId);

    void addAlbumReaction(UUID userId, UUID albumId, ReactionType reactionType);

    AlbumReactionDetailsResponse getAlbumReactionDetails(UUID viewerId, UUID albumId);

    void removeAlbumReaction(UUID userId, UUID albumId);

    AlbumCommentResponse addMediaComment(UUID userId, UUID albumId, UUID mediaId, CreateAlbumCommentRequest request);

    List<AlbumCommentResponse> getMediaComments(UUID viewerId, UUID albumId, UUID mediaId);

    void addMediaReaction(UUID userId, UUID albumId, UUID mediaId, ReactionType reactionType);

    void removeMediaReaction(UUID userId, UUID albumId, UUID mediaId);

    ShareAlbumResponse shareAlbum(UUID userId, UUID albumId, ShareAlbumRequest request);

    void sendAlbumToUser(UUID senderId, UUID albumId, UUID recipientId);

    Page<AlbumResponse> getGroupAlbums(UUID viewerId, UUID groupId, Pageable pageable);

    void reportAlbum(UUID userId, UUID albumId, ReportAlbumRequest request);

    List<AlbumMediaResponse> importMedia(UUID userId, UUID albumId, ImportAlbumMediaRequest request);
}
