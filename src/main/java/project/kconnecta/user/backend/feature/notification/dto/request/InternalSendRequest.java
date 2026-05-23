package project.kconnecta.user.backend.feature.notification.dto.request;

import java.util.UUID;

public record InternalSendRequest(UUID recipientUserId, String text) {}
