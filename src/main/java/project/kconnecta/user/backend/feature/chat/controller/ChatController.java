package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReactionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReportRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallRecordingResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.service.CallRecordingService;
import project.kconnecta.user.backend.feature.chat.service.ChatService;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final CallRecordingService callRecordingService;

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
