package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class PostResponse {
    private UUID id;
    private UUID authorId;
    private UUID groupId;
    private String groupName;
    private String groupIconUrl;
    private UUID pageId;
    private String pageName;
    private String pageAvatarUrl;
    private String authorUsername;
    private String authorFullName;
    private String authorAvatarUrl;
    private String content;
    private String imageUrl;
    private PostPrivacy privacy;
    private PostStatus status;
    private LocalDateTime scheduledAt;
    private LocalDateTime publishedAt;
    private String locationText;
    private String backgroundStyle;
    private boolean promoted;
    private long reactionCount;
    private List<PostReactionCountResponse> reactionCounts;
    private ReactionType currentUserReactionType;
    private boolean savedByCurrentUser;
    private long commentCount;
    private long shareCount;
    private List<PostMediaResponse> media;
    private List<UUID> excludedUserIds;
    private List<UUID> allowedUserIds;
    private List<UUID> taggedUserIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Set to true when this PostResponse is a share wrapper (not an original post)
    private boolean sharedPost;
    // Embedded original post (non-null only when sharedPost == true)
    private PostResponse originalPost;

    // Embedded group summary (non-null only when this post shares a group to the feed)
    private SharedGroupResponse sharedGroup;

    // Embedded album summary (non-null when this post shares an album to the feed)
    private SharedAlbumResponse sharedAlbum;

    private PostPollResponse poll;
}
