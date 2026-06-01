package project.kconnecta.user.backend.feature.policy.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.List;

public record PublicPolicyResponse(
        LocalDateTime updatedAt,
        List<CommunityRuleView> communityRules,
        PostPolicyView postPolicy,
        ChatPolicyView chatPolicy,
        PrivacyPolicyView privacy,
        JsonNode fullConfig
) {
    public record CommunityRuleView(String id, String label, String description, String severity) {
    }

    public record PostPolicyView(
            int maxPostLength,
            int maxImagesPerPost,
            int maxVideoMb,
            String allowedFileTypes,
            int postsPerMinute
    ) {
    }

    public record ChatPolicyView(
            boolean antiSpamEnabled,
            boolean blockMaliciousLinks,
            int messagesPerMinute,
            boolean aiScanEnabled
    ) {
    }

    public record PrivacyPolicyView(
            int logRetentionDays,
            int chatRetentionDays,
            boolean allowDataExport,
            boolean allowAccountDeletion,
            boolean cookiePolicyEnabled,
            int sessionMaxHours
    ) {
    }
}
