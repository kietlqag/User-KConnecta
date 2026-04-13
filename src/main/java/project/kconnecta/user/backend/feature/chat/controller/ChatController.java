package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.chat.dto.response.CallRecordingResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.service.CallRecordingService;
import project.kconnecta.user.backend.feature.chat.service.ChatService;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final CallRecordingService callRecordingService;

    @GetMapping("/history")
    public ResponseEntity<List<ChatMessageResponse>> getChatHistory(
            @RequestParam UUID userId1,
            @RequestParam UUID userId2
    ) {
        return ResponseEntity.ok(chatService.getChatHistory(userId1, userId2));
    }

    @PostMapping(value = "/calls/{callId}/recordings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CallRecordingResponse> uploadCallRecording(
            @PathVariable UUID callId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "durationSec", required = false) Integer durationSec,
            Principal principal
    ) {
        String username = principal == null ? null : principal.getName();
        return ResponseEntity.ok(callRecordingService.saveRecording(callId, username, file, durationSec));
    }
}
