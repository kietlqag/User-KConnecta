package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import project.kconnecta.user.backend.feature.chat.dto.request.CallSignalRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.ConversationSeenRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageDeliveredRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSignalResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.CallSignalEvent;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.CallSignalEventRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.chat.service.impl.ChatServiceImpl;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private static final String MEDIA_TYPE_AUDIO = "audio";
    private static final String MEDIA_TYPE_VIDEO = "video";

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

    @MessageMapping("/chat.delivered")
    public void markDelivered(MessageDeliveredRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.markMessageDelivered(principal.getName(), request.getMessageId());
    }

    @MessageMapping("/chat.seen")
    public void markSeen(ConversationSeenRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.markConversationSeen(principal.getName(), request.getPeerUserId());
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

        LocalDateTime now = LocalDateTime.now();
        CallSession session = persistCallData(request, sender, receiver, now);
        CallSessionSnapshotResponse snapshot = session == null
                ? new CallSessionSnapshotResponse(request.getCallId(), null, null, null, null, null, null)
                : ChatServiceImpl.toSnapshot(session, now);
        CallSignalResponse response = new CallSignalResponse(
                request.getCallId(),
                sender.getId(),
                receiver.getId(),
                sender.getUsername(),
                request.getType(),
                normalizeMediaType(request.getMediaType()),
                request.getSdp(),
                request.getCandidate(),
                request.getSdpMid(),
                request.getSdpMLineIndex(),
                now,
                snapshot.getStatus(),
                snapshot.getMediaType(),
                snapshot.getStartedAt(),
                snapshot.getAnsweredAt(),
                snapshot.getEndedAt(),
                snapshot.getDurationSec()
        );

        messagingTemplate.convertAndSendToUser(receiver.getUsername(), "/queue/call", response);
        messagingTemplate.convertAndSendToUser(sender.getUsername(), "/queue/call", response);
    }

    private CallSession persistCallData(CallSignalRequest request, User sender, User receiver, LocalDateTime now) {
        UUID callId = request.getCallId();
        String type = request.getType();
        if (callId == null || type == null) {
            return null;
        }

        CallSession session = callSessionRepository.findByCallId(callId)
                .orElseGet(() -> CallSession.builder()
                        .callId(callId)
                        .caller(inferCaller(type, sender, receiver))
                        .callee(inferCallee(type, sender, receiver))
                        .startedAt(now)
                        .status("RINGING")
                        .lastSignalType(type)
                        .callMediaType(MEDIA_TYPE_AUDIO)
                        .build());

        if (session.getCaller() == null || session.getCallee() == null) {
            session.setCaller(inferCaller(type, sender, receiver));
            session.setCallee(inferCallee(type, sender, receiver));
        }
        if (session.getStartedAt() == null) {
            session.setStartedAt(now);
        }
        if (session.getCallMediaType() == null || session.getCallMediaType().isBlank()) {
            session.setCallMediaType(MEDIA_TYPE_AUDIO);
        }

        String mediaTypeFromSignal = resolveMediaType(request.getMediaType(), request.getSdp());
        if (MEDIA_TYPE_VIDEO.equals(mediaTypeFromSignal)) {
            session.setCallMediaType(MEDIA_TYPE_VIDEO);
        }

        session.setLastSignalType(type);

        if (isTerminalStatus(session.getStatus()) && !"CALL_END".equals(type)) {
            session = callSessionRepository.save(session);
            persistCallEvent(request, sender, receiver, session, type, now);
            return session;
        }

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
                if (session.getAnsweredAt() != null) {
                    int durationSec = (int) ChronoUnit.SECONDS.between(session.getAnsweredAt(), now);
                    session.setDurationSec(Math.max(durationSec, 0));
                    session.setStatus("COMPLETED");
                } else {
                    session.setStatus("MISSED");
                }
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
        persistCallEvent(request, sender, receiver, session, type, now);

        if (("CALL_END".equals(type) || "CALL_REJECT".equals(type) || "CALL_CANCEL".equals(type))
                && !Boolean.TRUE.equals(session.getCallLogSent())) {
            String callLogContent = buildCallLogContent(session);
            if (callLogContent != null) {
                chatService.sendSystemMessage(session.getCaller().getId(), session.getCallee().getId(), callLogContent);
                session.setCallLogSent(true);
                callSessionRepository.save(session);
            }
        }
        return session;
    }

    private void persistCallEvent(CallSignalRequest request, User sender, User receiver, CallSession session, String type, LocalDateTime now) {
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
    }

    private boolean isTerminalStatus(String status) {
        return "COMPLETED".equals(status) || "MISSED".equals(status);
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

    private String inferMediaTypeFromSdp(String sdp) {
        if (sdp == null || sdp.isBlank()) {
            return MEDIA_TYPE_AUDIO;
        }
        return sdp.toLowerCase().contains("m=video") ? MEDIA_TYPE_VIDEO : MEDIA_TYPE_AUDIO;
    }

    private String normalizeMediaType(String mediaType) {
        if (MEDIA_TYPE_VIDEO.equalsIgnoreCase(mediaType)) {
            return MEDIA_TYPE_VIDEO;
        }
        return MEDIA_TYPE_AUDIO;
    }

    private String resolveMediaType(String mediaType, String sdp) {
        if (MEDIA_TYPE_VIDEO.equalsIgnoreCase(mediaType)) {
            return MEDIA_TYPE_VIDEO;
        }
        return inferMediaTypeFromSdp(sdp);
    }

    private String buildCallLogContent(CallSession session) {
        String mediaType = MEDIA_TYPE_VIDEO.equalsIgnoreCase(session.getCallMediaType())
                ? MEDIA_TYPE_VIDEO
                : MEDIA_TYPE_AUDIO;

        if ("COMPLETED".equals(session.getStatus())) {
            int durationSec = session.getDurationSec() == null ? 0 : session.getDurationSec();
            String label = MEDIA_TYPE_VIDEO.equals(mediaType)
                    ? "Cu\u1ed9c g\u1ecdi video ho\u00e0n th\u00e0nh"
                    : "Cu\u1ed9c g\u1ecdi tho\u1ea1i ho\u00e0n th\u00e0nh";
            return "__CALL_LOG__:{\"kind\":\"completed\",\"mediaType\":\""
                    + mediaType
                    + "\",\"label\":\""
                    + label
                    + "\",\"durationSec\":"
                    + durationSec
                    + "}";
        }

        if ("MISSED".equals(session.getStatus())) {
            String label = MEDIA_TYPE_VIDEO.equals(mediaType)
                    ? "\u0110\u00e3 b\u1ecf l\u1ee1 cu\u1ed9c g\u1ecdi video"
                    : "\u0110\u00e3 b\u1ecf l\u1ee1 cu\u1ed9c g\u1ecdi tho\u1ea1i";
            return "__CALL_LOG__:{\"kind\":\"missed\",\"mediaType\":\""
                    + mediaType
                    + "\",\"label\":\""
                    + label
                    + "\"}";
        }

        return null;
    }

    @MessageExceptionHandler
    public void handleSocketError(Exception ignored) {
        // Keep websocket handler resilient; client will handle call timeout/retry.
    }
}

