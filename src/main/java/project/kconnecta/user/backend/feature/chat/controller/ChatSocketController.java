package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import project.kconnecta.user.backend.feature.chat.dto.request.CallSignalRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSignalResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.CallSignalEvent;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.CallSignalEventRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final CallSessionRepository callSessionRepository;
    private final CallSignalEventRepository callSignalEventRepository;

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(PrivateMessageRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.sendPrivateMessage(principal.getName(), request);
    }

    @MessageMapping("/call.signal")
    public void sendCallSignal(CallSignalRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }

        User sender = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalStateException("Sender not found"));
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new IllegalStateException("Receiver not found"));

        CallSignalResponse response = new CallSignalResponse(
                request.getCallId(),
                sender.getId(),
                receiver.getId(),
                sender.getUsername(),
                request.getType(),
                request.getSdp(),
                request.getCandidate(),
                request.getSdpMid(),
                request.getSdpMLineIndex(),
                LocalDateTime.now()
        );

        persistCallData(request, sender, receiver, response.getCreatedAt());

        messagingTemplate.convertAndSendToUser(receiver.getUsername(), "/queue/call", response);
        messagingTemplate.convertAndSendToUser(sender.getUsername(), "/queue/call", response);
    }

    private void persistCallData(CallSignalRequest request, User sender, User receiver, LocalDateTime now) {
        UUID callId = request.getCallId();
        String type = request.getType();
        if (callId == null || type == null) {
            return;
        }

        CallSession session = callSessionRepository.findByCallId(callId)
                .orElseGet(() -> CallSession.builder()
                        .callId(callId)
                        .caller(inferCaller(type, sender, receiver))
                        .callee(inferCallee(type, sender, receiver))
                        .startedAt(now)
                        .status("RINGING")
                        .lastSignalType(type)
                        .build());

        if (session.getCaller() == null || session.getCallee() == null) {
            session.setCaller(inferCaller(type, sender, receiver));
            session.setCallee(inferCallee(type, sender, receiver));
        }
        if (session.getStartedAt() == null) {
            session.setStartedAt(now);
        }
        session.setLastSignalType(type);

        switch (type) {
            case "CALL_INVITE" -> {
                session.setCaller(sender);
                session.setCallee(receiver);
                session.setStatus("RINGING");
            }
            case "CALL_ACCEPT" -> {
                if (session.getAnsweredAt() == null) {
                    session.setAnsweredAt(now);
                }
                session.setStatus("ONGOING");
            }
            case "CALL_REJECT", "CALL_CANCEL" -> {
                session.setEndedAt(now);
                session.setStatus("MISSED");
            }
            case "CALL_END" -> {
                session.setEndedAt(now);
                if (session.getAnsweredAt() != null) {
                    int durationSec = (int) ChronoUnit.SECONDS.between(session.getAnsweredAt(), now);
                    if (durationSec < 0) {
                        durationSec = 0;
                    }
                    session.setDurationSec(durationSec);
                    session.setStatus("COMPLETED");
                } else {
                    session.setStatus("MISSED");
                }
            }
            default -> {
                // keep status for other signaling types
            }
        }

        session = callSessionRepository.save(session);

        CallSignalEvent event = CallSignalEvent.builder()
                .callSession(session)
                .fromUser(sender)
                .toUser(receiver)
                .signalType(type)
                .sdp(request.getSdp())
                .candidate(request.getCandidate())
                .sdpMid(request.getSdpMid())
                .sdpMLineIndex(request.getSdpMLineIndex())
                .createdAt(now)
                .build();
        callSignalEventRepository.save(event);

        if (("CALL_END".equals(type) || "CALL_REJECT".equals(type) || "CALL_CANCEL".equals(type))
                && !Boolean.TRUE.equals(session.getCallLogSent())) {
            String callLogContent = buildCallLogContent(session);
            if (callLogContent != null) {
                chatService.sendSystemMessage(session.getCaller().getId(), session.getCallee().getId(), callLogContent);
                session.setCallLogSent(true);
                callSessionRepository.save(session);
            }
        }
    }

    private User inferCaller(String type, User sender, User receiver) {
        return switch (type) {
            case "CALL_ACCEPT", "CALL_REJECT", "CALL_ANSWER" -> receiver;
            default -> sender;
        };
    }

    private User inferCallee(String type, User sender, User receiver) {
        return switch (type) {
            case "CALL_ACCEPT", "CALL_REJECT", "CALL_ANSWER" -> sender;
            default -> receiver;
        };
    }

    private String buildCallLogContent(CallSession session) {
        if ("COMPLETED".equals(session.getStatus())) {
            int durationSec = session.getDurationSec() == null ? 0 : session.getDurationSec();
            return "__CALL_LOG__:{\"kind\":\"completed\",\"label\":\"Cuộc gọi hoàn thành\",\"durationSec\":" + durationSec + "}";
        }
        if ("MISSED".equals(session.getStatus())) {
            return "__CALL_LOG__:{\"kind\":\"missed\",\"label\":\"Đã bỏ lỡ cuộc gọi thoại\"}";
        }
        return null;
    }

    @MessageExceptionHandler
    public void handleSocketError(Exception ignored) {
        // Keep websocket handler resilient; client will handle call timeout/retry.
    }
}