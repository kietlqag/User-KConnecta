package project.kconnecta.user.backend.feature.policy.dto;

public record PolicyKeywordMergeResult(
        int added,
        int skipped,
        int totalKeywords
) {}
