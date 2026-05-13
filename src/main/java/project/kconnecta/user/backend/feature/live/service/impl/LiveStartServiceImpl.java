package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.StartLiveRequest;
import project.kconnecta.user.backend.feature.live.dto.response.StartLiveResponse;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.live.service.LiveStartService;
import project.kconnecta.user.backend.feature.post.dto.request.CreatePostRequest;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;
import project.kconnecta.user.backend.feature.post.service.PostService;

@Service
@RequiredArgsConstructor
@Transactional
public class LiveStartServiceImpl implements LiveStartService {

    private final PostService postService;

    @Override
    public StartLiveResponse startLive(StartLiveRequest request) {
        if (request.getStartMode() == LiveStartMode.SCHEDULED && request.getScheduledAt() == null) {
            throw new ValidationException("scheduledAt is required when startMode is SCHEDULED");
        }

        CreatePostRequest createPostRequest = new CreatePostRequest();
        createPostRequest.setAuthorId(request.getUserId());
        createPostRequest.setGroupId(request.getGroupId());
        createPostRequest.setContent(buildContent(request.getTitle(), request.getDescription()));
        createPostRequest.setPrivacy(request.getPrivacy());
        createPostRequest.setStatus(request.getStartMode() == LiveStartMode.SCHEDULED ? PostStatus.SCHEDULED : PostStatus.PUBLISHED);
        createPostRequest.setScheduledAt(request.getStartMode() == LiveStartMode.SCHEDULED ? request.getScheduledAt() : null);
        createPostRequest.setLocationText(request.getLocationText());
        createPostRequest.setBackgroundStyle("LIVE_POST");
        createPostRequest.setExcludedUserIds(request.getExcludedUserIds());
        createPostRequest.setTaggedUserIds(request.getTaggedUserIds());
        createPostRequest.setPromoted(Boolean.FALSE);

        PostResponse post = postService.createPost(createPostRequest);

        return StartLiveResponse.builder()
                .postId(post.getId())
                .userId(post.getAuthorId())
                .title(request.getTitle().trim())
                .startMode(request.getStartMode())
                .postStatus(post.getStatus())
                .scheduledAt(post.getScheduledAt())
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .build();
    }

    private String buildContent(String title, String description) {
        String safeTitle = title == null ? "" : title.trim();
        String safeDescription = description == null ? "" : description.trim();
        if (safeTitle.isBlank() && safeDescription.isBlank()) {
            throw new ValidationException("Live post content cannot be empty");
        }
        if (safeTitle.isBlank()) return safeDescription;
        if (safeDescription.isBlank()) return safeTitle;
        return safeTitle + "\n\n" + safeDescription;
    }
}
