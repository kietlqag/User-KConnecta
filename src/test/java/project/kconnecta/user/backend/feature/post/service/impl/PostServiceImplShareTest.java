package project.kconnecta.user.backend.feature.post.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.entity.PostShare;
import project.kconnecta.user.backend.feature.post.repository.PostCommentRepository;
import project.kconnecta.user.backend.feature.post.repository.PostReactionRepository;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.post.repository.PostSavedRepository;
import project.kconnecta.user.backend.feature.post.repository.PostShareRepository;
import project.kconnecta.user.backend.feature.policy.service.RecommendationPolicyReader;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceImplShareTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private FriendshipRepository friendshipRepository;
    @Mock
    private PostShareRepository postShareRepository;
    @Mock
    private PostReactionRepository postReactionRepository;
    @Mock
    private PostCommentRepository postCommentRepository;
    @Mock
    private PostSavedRepository postSavedRepository;
    @Mock
    private RecommendationPolicyReader recommendationPolicyReader;

    @InjectMocks
    private PostServiceImpl postService;

    @Test
    void getAllPosts_withDuplicateShares_doesNotThrowDuplicateKeyException() {
        UUID currentUserId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 10);

        // 1. Mock regular posts
        User author = User.builder().id(UUID.randomUUID()).username("author").fullName("Author Name").build();
        Post post1 = Post.builder().id(UUID.randomUUID()).author(author).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).media(new ArrayList<>()).mentions(new ArrayList<>()).audienceAllowances(new ArrayList<>()).audienceExclusions(new ArrayList<>()).build();
        Page<Post> postPage = new PageImpl<>(List.of(post1), pageable, 1);
        when(recommendationPolicyReader.getFeedWeights())
                .thenReturn(new RecommendationPolicyReader.FeedWeights(0.2, 0.4, 0.4));
        when(postRepository.findHomeFeedPostsWithScoring(eq(currentUserId), anyDouble(), anyDouble(), anyDouble(), eq(pageable)))
                .thenReturn(postPage);

        // Mock bulk processing data for the home feed post
        when(postReactionRepository.findReactionCountsByPostIds(anyList())).thenReturn(Collections.emptyList());
        when(postCommentRepository.countByPostIdIn(anyList())).thenReturn(Collections.emptyList());
        when(postShareRepository.countByPostIdIn(anyList())).thenReturn(Collections.emptyList());
        when(postReactionRepository.findAllByUserIdAndPostIdIn(eq(currentUserId), anyList())).thenReturn(Collections.emptyList());
        when(postSavedRepository.findSavedPostIdsByUserIdAndPostIdIn(eq(currentUserId), anyList())).thenReturn(Collections.emptySet());

        // 2. Mock friends for sharing query
        UUID friendId = UUID.randomUUID();
        when(friendshipRepository.findFriendIdsByUserIdAndStatus(eq(currentUserId), eq(FriendshipStatus.ACCEPTED)))
                .thenReturn(List.of(friendId));

        // 3. Mock shares with duplicate posts
        User sharer = User.builder().id(friendId).username("friend").fullName("Friend Name").build();
        Post sharedPost = Post.builder().id(UUID.randomUUID()).author(author).createdAt(LocalDateTime.now().minusDays(1)).updatedAt(LocalDateTime.now().minusDays(1)).media(new ArrayList<>()).mentions(new ArrayList<>()).audienceAllowances(new ArrayList<>()).audienceExclusions(new ArrayList<>()).build();

        PostShare share1 = PostShare.builder().id(UUID.randomUUID()).user(sharer).post(sharedPost).sharedContent("Share 1").createdAt(LocalDateTime.now()).build();
        PostShare share2 = PostShare.builder().id(UUID.randomUUID()).user(sharer).post(sharedPost).sharedContent("Share 2").createdAt(LocalDateTime.now()).build();

        when(postShareRepository.findRecentSharesByUserIds(anyList(), any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of(share1, share2));

        // Run the method
        Page<PostResponse> result = postService.getAllPosts(currentUserId, pageable);

        // Verify that the call succeeded and returned responses
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(3); // 1 original post + 2 shares
        
        // Assert that both shares are included
        long shareCount = result.getContent().stream().filter(PostResponse::isSharedPost).count();
        assertThat(shareCount).isEqualTo(2);
    }
}
