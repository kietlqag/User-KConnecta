package project.kconnecta.user.backend.feature.post.service;

import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.UpdateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SavePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.CheckInSuggestionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionDetailsResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface PostService {
    PostResponse createPost(CreatePostRequest request);
    String uploadPostImage(MultipartFile file);
    void deleteMedia(String url);
    Page<PostResponse> getAllPosts(UUID currentUserId, Pageable pageable);
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
    PostCommentResponse updateComment(UUID commentId, UpdateCommentRequest request);
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
}
