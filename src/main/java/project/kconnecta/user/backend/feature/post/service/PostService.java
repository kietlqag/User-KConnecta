package project.kconnecta.user.backend.feature.post.service;

import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionDetailsResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface PostService {
    PostResponse createPost(CreatePostRequest request);
    String uploadPostImage(MultipartFile file);
    List<PostResponse> getAllPosts(UUID currentUserId);
    List<PostResponse> getPostsByUserId(UUID authorId, UUID currentUserId);
    List<PostResponse> getPostsByGroupId(UUID groupId, UUID currentUserId);
    List<PostResponse> getGroupFeedPosts(UUID currentUserId);
    PostResponse getPostById(UUID id, UUID currentUserId);
    PostReactionResponse addReaction(UUID postId, AddReactionRequest request);
    void removeReaction(UUID postId, UUID userId);
    PostReactionDetailsResponse getReactionDetails(UUID postId);
    List<PostCommentResponse> getComments(UUID postId);
    PostCommentResponse addComment(UUID postId, CreateCommentRequest request);
    PostShareResponse sharePost(UUID postId, SharePostRequest request);
}
