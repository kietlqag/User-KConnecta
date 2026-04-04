package project.kconnecta.user.backend.feature.post.service;

import project.kconnecta.user.backend.feature.post.dto.request.AddReactionRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreateCommentRequest;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.request.SharePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostCommentResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostShareResponse;

import java.util.List;
import java.util.UUID;

public interface PostService {
    PostResponse createPost(CreatePostRequest request);
    List<PostResponse> getAllPosts();
    PostResponse getPostById(UUID id);
    PostReactionResponse addReaction(UUID postId, AddReactionRequest request);
    PostCommentResponse addComment(UUID postId, CreateCommentRequest request);
    PostShareResponse sharePost(UUID postId, SharePostRequest request);
}
