package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Reads the AI-moderation policy (shared {@code platform_policy} singleton, set from the admin
 * "AI moderation" tab) at runtime: the on/off toggle, the sensitivity threshold, and the per-category
 * detect switches. Auto-actions (autoHidePost / autoWarning / autoBan) are intentionally NOT read here —
 * they remain deferred until a dedicated action flow is built.
 */
@Component
@RequiredArgsConstructor
public class AiModerationPolicyReader {

    /** Khớp giá trị mặc định ở default-config.json và frontend admin. */
    private static final int DEFAULT_SENSITIVITY = 72;

    private final PolicyService policyService;

    /** True when AI moderation is on. Defaults to true when the key is absent (matches default-config + frontend). */
    public boolean isEnabled() {
        return aiNode().path("enabled").asBoolean(true);
    }

    /**
     * Độ nhạy 0–100 (cao = chặn sớm hơn). Ngưỡng điểm để chặn = (100 − sensitivity)/100,
     * khớp {@code resolveFlagThresholdPct} của playground admin nên preview và runtime trùng nhau.
     */
    public double flagThreshold() {
        int sensitivity = aiNode().path("sensitivity").asInt(DEFAULT_SENSITIVITY);
        int clamped = Math.max(0, Math.min(100, sensitivity));
        return (100 - clamped) / 100.0;
    }

    /** Các nhóm vi phạm đang bật. Mặc định bật hết khi thiếu cấu hình. */
    public DetectConfig detect() {
        JsonNode d = aiNode().path("detect");
        return new DetectConfig(
                d.path("toxic").asBoolean(true),
                d.path("spam").asBoolean(true),
                d.path("nsfw").asBoolean(true),
                d.path("hateSpeech").asBoolean(true),
                d.path("scam").asBoolean(true)
        );
    }

    private JsonNode aiNode() {
        return policyService.getConfigJson().path("aiModeration");
    }

    /** Năm nhóm phát hiện khớp toggle {@code detect} bên admin. */
    public record DetectConfig(boolean toxic, boolean spam, boolean nsfw, boolean hateSpeech, boolean scam) {
        public boolean anyEnabled() {
            return toxic || spam || nsfw || hateSpeech || scam;
        }
    }
}
