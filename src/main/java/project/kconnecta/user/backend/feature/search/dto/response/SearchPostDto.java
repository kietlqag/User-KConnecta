package project.kconnecta.user.backend.feature.search.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchPostDto implements Serializable {

    private static final long serialVersionUID = 2L;

    private String id;
    private String type; // "post"
    private AuthorDto author;
    private String timestamp;
    private String publishedAt;
    private String content;
    private String image;
    private String video;
    private Long likes;
    private Long comments;
    private Long shares;
    private String userReactionType; // null if not reacted
    private Boolean savedByCurrentUser;
    private String groupId;
    private List<MediaItem> mediaItems;
    /** POST = feed post, REEL = Watch reel */
    private String postType;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthorDto implements Serializable {
        private static final long serialVersionUID = 2L;
        private String id;
        private String name;
        private String avatar;
        private String type; // "person" | "group"
        private String groupName;
        private String groupIconUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MediaItem implements Serializable {
        private static final long serialVersionUID = 1L;
        private String type; // "IMAGE" | "VIDEO"
        private String url;
    }
}
