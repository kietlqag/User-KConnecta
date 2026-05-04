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
import project.kconnecta.user.backend.feature.chat.dto.request.AddGroupMembersRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReportRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.CreateGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.UpdateGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.UpdateGroupMemberNicknameRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.CreateGroupCallSessionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.GroupMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.ConversationPinRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PinnedMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallRecordingResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatFileUploadResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatImageUploadResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatAssetPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupConversationResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupCallSessionResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ConversationPinResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.PinnedMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.VoiceMessageUploadResponse;
import project.kconnecta.user.backend.feature.chat.service.CallRecordingService;
import project.kconnecta.user.backend.feature.chat.service.ChatService;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final long MAX_VOICE_MESSAGE_BYTES = 8L * 1024L * 1024L;
    private static final long MAX_CHAT_IMAGE_BYTES = 10L * 1024L * 1024L;
    private static final long MAX_CHAT_FILE_BYTES = 25L * 1024L * 1024L;

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

    @GetMapping("/conversations/{conversationId}/history")
    public ResponseEntity<ChatHistoryPageResponse> getGroupChatHistory(
            @PathVariable UUID conversationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime beforeCreatedAt,
            @RequestParam(required = false) Integer limit,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getGroupChatHistory(principal.getName(), conversationId, beforeCreatedAt, limit));
    }

    @GetMapping("/assets/private/{peerUserId}")
    public ResponseEntity<ChatAssetPageResponse> getPrivateAssets(
            @PathVariable UUID peerUserId,
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime beforeCreatedAt,
            @RequestParam(required = false) Integer limit,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getPrivateAssets(principal.getName(), peerUserId, type, beforeCreatedAt, limit));
    }

    @GetMapping("/assets/group/{conversationId}")
    public ResponseEntity<ChatAssetPageResponse> getGroupAssets(
            @PathVariable UUID conversationId,
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime beforeCreatedAt,
            @RequestParam(required = false) Integer limit,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getGroupAssets(principal.getName(), conversationId, type, beforeCreatedAt, limit));
    }

    @PostMapping("/conversations/group")
    public ResponseEntity<GroupConversationResponse> createGroupConversation(
            @RequestBody CreateGroupConversationRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.createGroupConversation(principal.getName(), request));
    }

    @GetMapping("/conversations/group")
    public ResponseEntity<List<GroupConversationResponse>> getMyGroupConversations(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getMyGroupConversations(principal.getName()));
    }

    @PutMapping("/conversations/{conversationId}")
    public ResponseEntity<GroupConversationResponse> updateGroupConversation(
            @PathVariable UUID conversationId,
            @RequestBody UpdateGroupConversationRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.updateGroupConversation(principal.getName(), conversationId, request));
    }

    @PutMapping("/conversations/{conversationId}/members/{memberUserId}/nickname")
    public ResponseEntity<GroupConversationResponse> updateGroupMemberNickname(
            @PathVariable UUID conversationId,
            @PathVariable UUID memberUserId,
            @RequestBody(required = false) UpdateGroupMemberNicknameRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.updateGroupMemberNickname(principal.getName(), conversationId, memberUserId, request));
    }

    @PostMapping("/conversations/{conversationId}/members")
    public ResponseEntity<GroupConversationResponse> addGroupMembers(
            @PathVariable UUID conversationId,
            @RequestBody AddGroupMembersRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.addGroupMembers(principal.getName(), conversationId, request));
    }

    @PostMapping("/conversations/{conversationId}/calls")
    public ResponseEntity<GroupCallSessionResponse> createGroupCallSession(
            @PathVariable UUID conversationId,
            @RequestBody(required = false) CreateGroupCallSessionRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.createGroupCallSession(principal.getName(), conversationId, request));
    }

    @GetMapping("/conversations/group/calls/{callId}/session")
    public ResponseEntity<GroupCallSessionResponse> getGroupCallSessionSnapshot(
            @PathVariable UUID callId,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getGroupCallSessionSnapshot(principal.getName(), callId));
    }

    @PutMapping("/conversations/pin")
    public ResponseEntity<ConversationPinResponse> setConversationPinned(
            @RequestBody ConversationPinRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.setConversationPinned(principal.getName(), request));
    }

    @GetMapping("/conversations/pin")
    public ResponseEntity<List<ConversationPinResponse>> getPinnedConversations(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getPinnedConversations(principal.getName()));
    }

    @PutMapping("/messages/pin")
    public ResponseEntity<PinnedMessageResponse> setPinnedMessage(
            @RequestBody PinnedMessageRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.setPinnedMessage(principal.getName(), request));
    }

    @GetMapping("/messages/pin")
    public ResponseEntity<List<PinnedMessageResponse>> getPinnedMessages(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.getPinnedMessages(principal.getName()));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ChatMessageResponse> sendGroupMessage(
            @PathVariable UUID conversationId,
            @RequestBody GroupMessageRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        GroupMessageRequest normalized = request == null ? new GroupMessageRequest() : request;
        normalized.setConversationId(conversationId);
        return ResponseEntity.ok(chatService.sendGroupMessage(principal.getName(), normalized));
    }

    @PostMapping(value = "/calls/{callId}/recordings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CallRecordingResponse> uploadCallRecording(
            @PathVariable UUID callId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "durationSec", required = false) Integer durationSec,
            @RequestParam(value = "mediaType", required = false) String mediaType,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
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

    @PostMapping(value = "/messages/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatFileUploadResponse> uploadChatFile(
            @RequestParam("file") MultipartFile file,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        if (file == null || file.isEmpty()) {
            throw new ValidationException("File is required");
        }
        if (file.getSize() > MAX_CHAT_FILE_BYTES) {
            throw new ValidationException("File is too large");
        }

        String fileUrl = cloudinaryService.uploadChatFile(file);
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        String safeFilename = originalFilename == null || originalFilename.isBlank() ? "file" : originalFilename;

        return ResponseEntity.ok(
                ChatFileUploadResponse.builder()
                        .fileUrl(fileUrl)
                        .fileName(safeFilename)
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
