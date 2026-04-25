package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReactionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReportRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallRecordingResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatImageUploadResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.VoiceMessageUploadResponse;
import project.kconnecta.user.backend.feature.chat.service.CallRecordingService;
import project.kconnecta.user.backend.feature.chat.service.ChatService;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final long MAX_VOICE_MESSAGE_BYTES = 8L * 1024L * 1024L;
    private static final long MAX_CHAT_IMAGE_BYTES = 10L * 1024L * 1024L;

    private final ChatService chatService;
    private final CallRecordingService callRecordingService;
    private final CloudinaryService cloudinaryService;

    @GetMapping("/history")
    public ResponseEntity<ChatHistoryPageResponse> getChatHistory(
            @RequestParam UUID userId1,
            @RequestParam UUID userId2,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime beforeCreatedAt,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(chatService.getChatHistory(userId1, userId2, beforeCreatedAt, limit));
    }

    @PostMapping(value = "/calls/{callId}/recordings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CallRecordingResponse> uploadCallRecording(
            @PathVariable UUID callId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "durationSec", required = false) Integer durationSec,
            @RequestParam(value = "mediaType", required = false) String mediaType,
            Principal principal
    ) {
        String username = principal == null ? null : principal.getName();
        return ResponseEntity.ok(callRecordingService.saveRecording(callId, username, file, durationSec, mediaType));
    }

    @PostMapping(value = "/messages/voice", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VoiceMessageUploadResponse> uploadVoiceMessage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "durationSec", required = false) Integer durationSec,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Voice message file is required");
        }
        if (file.getSize() > MAX_VOICE_MESSAGE_BYTES) {
            throw new ValidationException("Voice message file is too large");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("audio/")) {
            throw new ValidationException("Unsupported voice message content type");
        }

        String audioUrl = cloudinaryService.uploadVoiceMessage(file);
        Integer safeDurationSec = durationSec == null ? null : Math.max(0, durationSec);

        return ResponseEntity.ok(
                VoiceMessageUploadResponse.builder()
                        .audioUrl(audioUrl)
                        .mimeType(contentType)
                        .fileSizeBytes(file.getSize())
                        .durationSec(safeDurationSec)
                        .build()
        );
    }

    @PostMapping(value = "/messages/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatImageUploadResponse> uploadChatImage(
            @RequestParam("file") MultipartFile file,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Image file is required");
        }
        if (file.getSize() > MAX_CHAT_IMAGE_BYTES) {
            throw new ValidationException("Image file is too large");
        }

        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("image/jpeg")
                        && !contentType.equals("image/png")
                        && !contentType.equals("image/webp")
                        && !contentType.equals("image/gif"))) {
            throw new ValidationException("Unsupported image content type");
        }

        String imageUrl = cloudinaryService.uploadChatImage(file);
        return ResponseEntity.ok(
                ChatImageUploadResponse.builder()
                        .imageUrl(imageUrl)
                        .mimeType(contentType)
                        .fileSizeBytes(file.getSize())
                        .build()
        );
    }

    @GetMapping("/calls/{callId}/session")
    public ResponseEntity<CallSessionSnapshotResponse> getCallSessionSnapshot(
            @PathVariable UUID callId,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getCallSessionSnapshot(principal.getName(), callId));
    }

    @PutMapping("/messages/{messageId}/reaction")
    public ResponseEntity<ChatMessageResponse> updateMessageReaction(
            @PathVariable UUID messageId,
            @RequestBody(required = false) MessageReactionRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.updateMessageReaction(principal.getName(), messageId, request));
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ChatMessageResponse> deleteMessage(
            @PathVariable UUID messageId,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.deleteMessage(principal.getName(), messageId));
    }

    @PostMapping("/messages/{messageId}/report")
    public ResponseEntity<Void> reportMessage(
            @PathVariable UUID messageId,
            @RequestBody(required = false) MessageReportRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        chatService.reportMessage(principal.getName(), messageId, request);
        return ResponseEntity.ok().build();
    }
}
