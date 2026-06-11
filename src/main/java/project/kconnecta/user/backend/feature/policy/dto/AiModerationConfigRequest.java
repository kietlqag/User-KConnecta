package project.kconnecta.user.backend.feature.policy.dto;

public record AiModerationConfigRequest(
        boolean enabled,
        int sensitivity,
        DetectConfig detect,
        boolean autoHidePost,
        boolean autoWarning,
        boolean autoBan
) {
    public record DetectConfig(
            boolean toxic,
            boolean spam,
            boolean nsfw,
            boolean hateSpeech,
            boolean scam
    ) {}
}
