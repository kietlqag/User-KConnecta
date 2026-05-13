package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.UpsertLivePinnedCommentRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LivePinnedCommentResponse;
import project.kconnecta.user.backend.feature.live.entity.LivePinnedCommentSetting;
import project.kconnecta.user.backend.feature.live.repository.LivePinnedCommentSettingRepository;
import project.kconnecta.user.backend.feature.live.service.LivePinnedCommentService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LivePinnedCommentServiceImpl implements LivePinnedCommentService {

    private static final int MAX_COMMENT_LENGTH = 1000;

    private final LivePinnedCommentSettingRepository livePinnedCommentSettingRepository;
    private final UserRepository userRepository;

    @Override
    public LivePinnedCommentResponse upsertPinnedComment(UpsertLivePinnedCommentRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));

        String normalizedText = request.getCommentText() == null ? "" : request.getCommentText().trim();
        validate(request.getEnabled(), normalizedText);

        LivePinnedCommentSetting setting = livePinnedCommentSettingRepository
                .findTopByUserIdOrderByUpdatedAtDesc(request.getUserId())
                .orElseGet(() -> LivePinnedCommentSetting.builder().user(user).build());

        setting.setEnabled(request.getEnabled());
        setting.setCommentText(normalizedText);

        return toResponse(livePinnedCommentSettingRepository.save(setting));
    }

    @Override
    @Transactional(readOnly = true)
    public LivePinnedCommentResponse getPinnedComment(UUID userId) {
        LivePinnedCommentSetting setting = livePinnedCommentSettingRepository
                .findTopByUserIdOrderByUpdatedAtDesc(userId)
                .orElse(null);

        if (setting == null) {
            return LivePinnedCommentResponse.builder()
                    .id(null)
                    .userId(userId)
                    .enabled(false)
                    .commentText("")
                    .updatedAt(null)
                    .build();
        }

        return toResponse(setting);
    }

    private void validate(boolean enabled, String commentText) {
        if (commentText.length() > MAX_COMMENT_LENGTH) {
            throw new ValidationException("commentText must be at most " + MAX_COMMENT_LENGTH + " characters");
        }
        if (enabled && commentText.isBlank()) {
            throw new ValidationException("commentText is required when pinned comment is enabled");
        }
    }

    private LivePinnedCommentResponse toResponse(LivePinnedCommentSetting setting) {
        return LivePinnedCommentResponse.builder()
                .id(setting.getId())
                .userId(setting.getUser().getId())
                .enabled(setting.isEnabled())
                .commentText(setting.getCommentText())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }
}

