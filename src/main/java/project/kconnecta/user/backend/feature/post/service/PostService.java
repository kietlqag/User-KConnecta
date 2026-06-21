package project.kconnecta.user.backend.feature.post.service;

import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SavePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.ReportCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.ReportPostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PendingCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.CheckInSuggestionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionDetailsResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReportResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface PostService {
    PostResponse createPost(CreatePostRequest request);
    PostResponse updatePost(UUID postId, UUID userId, UpdatePostRequest request);
    String uploadPostImage(UUID uploaderId, MultipartFile file);
    void deleteMedia(String url, UUID userId);
    Page<PostResponse> getAllPosts(UUID currentUserId, Pageable pageable);
    Page<PostResponse> getWatchPosts(UUID currentUserId, Pageable pageable);
    Page<PostResponse> getPostsByUserId(UUID authorId, UUID currentUserId, Pageable pageable);
    List<PostResponse> getPostsByGroupId(UUID groupId, UUID currentUserId);
    List<PostResponse> getGroupFeedPosts(UUID currentUserId);
    PostResponse getPostById(UUID id, UUID currentUserId);
    PostReactionResponse addReaction(UUID postId, AddReactionRequest request);
    void removeReaction(UUID postId, UUID userId);
    PostReactionDetailsResponse getReactionDetails(UUID postId);
    Page<PostCommentResponse> getComments(UUID postId, UUID currentUserId, Pageable pageable);
    List<PostCommentResponse> getReplies(UUID commentId, UUID currentUserId);
    PostCommentResponse addComment(UUID postId, CreateCommentRequest request);
    PostCommentResponse updateComment(UUID commentId, UUID userId, UpdateCommentRequest request);
    boolean deleteComment(UUID commentId, UUID userId);
    void likeComment(UUID commentId, UUID userId);
    void unlikeComment(UUID commentId, UUID userId);
    PostShareResponse sharePost(UUID postId, SharePostRequest request);
    void deletePost(UUID postId, UUID userId);
    void savePost(SavePostRequest request);
    List<PostResponse> getSavedPosts(UUID userId);
    void unsavePost(UUID userId, UUID postId);
    List<CheckInSuggestionResponse> getCheckInSuggestions(UUID currentUserId, String province, String ward);
    PostResponse updatePrivacy(UUID postId, UUID userId, PostPrivacy privacy);
    void reportPost(UUID postId, ReportPostRequest request);
    void reportComment(UUID commentId, ReportCommentRequest request);
    List<PostReportResponse> getMyReports(UUID userId);

    List<PostResponse> getPostsByIds(List<UUID> postIds, UUID currentUserId);

    /** Publishes all SCHEDULED posts with scheduledAt <= now. Returns number published. */
    int publishDueScheduledPosts();

    /** Runs AI moderation on a bounded batch of PENDING comments. Returns number resolved. */
    int moderatePendingComments();

    /** Comments stuck in PENDING (e.g. AI quota exhausted), for manual admin review. */
    Page<PendingCommentResponse> listPendingComments(Pageable pageable);

    /** Manually approve a comment (admin), making it visible and notifying the post author. */
    void approveComment(UUID commentId);

    /** Manually reject a comment (admin) with a reason. */
    void rejectComment(UUID commentId, String reason);
}
