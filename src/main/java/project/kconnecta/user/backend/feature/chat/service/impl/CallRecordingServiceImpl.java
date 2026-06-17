package project.kconnecta.user.backend.feature.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.BadRequestException;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.chat.dto.response.CallRecordingResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallRecording;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallRecording;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallSession;
import project.kconnecta.user.backend.feature.chat.repository.CallRecordingRepository;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationMemberRepository;
import project.kconnecta.user.backend.feature.chat.repository.GroupCallRecordingRepository;
import project.kconnecta.user.backend.feature.chat.repository.GroupCallSessionRepository;
import project.kconnecta.user.backend.feature.chat.service.CallRecordingService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CallRecordingServiceImpl implements CallRecordingService {

    private static final long MAX_RECORDING_SIZE_BYTES = 100L * 1024L * 1024L; // 100MB
    private static final String MEDIA_TYPE_VIDEO = "video";
    private static final String MEDIA_TYPE_AUDIO = "audio";

    private final UserRepository userRepository;
    private final CallSessionRepository callSessionRepository;
    private final GroupCallSessionRepository groupCallSessionRepository;
    private final ChatConversationMemberRepository chatConversationMemberRepository;
    private final CallRecordingRepository callRecordingRepository;
    private final GroupCallRecordingRepository groupCallRecordingRepository;
    private final CloudinaryService cloudinaryService;

    @Override
    @Transactional
    public CallRecordingResponse saveRecording(UUID callId, String username, MultipartFile file, Integer durationSec, String mediaType) {
        if (username == null || username.isBlank()) {
            throw new ForbiddenException("Unauthenticated request");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Recording file is required");
        }
        if (file.getSize() > MAX_RECORDING_SIZE_BYTES) {
            throw new BadRequestException("Recording file is too large");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("audio/") && !contentType.startsWith("video/")) {
            throw new BadRequestException("Unsupported recording content type");
        }

        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        boolean hasVideoByFile = contentType != null && contentType.startsWith("video/");
        boolean hasVideoBySignal = MEDIA_TYPE_VIDEO.equalsIgnoreCase(mediaType);
        Integer safeDurationSec = durationSec == null ? null : Math.max(0, durationSec);

        CallSession session = callSessionRepository.findByCallId(callId).orElse(null);
        if (session != null) {
            boolean isParticipant = session.getCaller().getId().equals(owner.getId()) || session.getCallee().getId().equals(owner.getId());
            if (!isParticipant) {
                throw new ForbiddenException("You are not a participant of this call");
            }
            boolean hasVideoBySession = MEDIA_TYPE_VIDEO.equalsIgnoreCase(session.getCallMediaType());
            boolean hasVideo = hasVideoByFile || hasVideoBySignal || hasVideoBySession;
            String recordingMediaType = hasVideo ? MEDIA_TYPE_VIDEO : MEDIA_TYPE_AUDIO;
            String fileUrl = cloudinaryService.uploadCallRecording(file, callId.toString());

            CallRecording recording = CallRecording.builder()
                    .callSession(session)
                    .ownerUser(owner)
                    .fileUrl(fileUrl)
                    .recordingMediaType(recordingMediaType)
                    .hasVideo(hasVideo)
                    .mimeType(contentType)
                    .fileSizeBytes(file.getSize())
                    .durationSec(safeDurationSec)
                    .createdAt(LocalDateTime.now())
                    .build();

            recording = callRecordingRepository.save(recording);
            return toResponse(
                    recording.getId(),
                    session.getCallId(),
                    owner.getId(),
                    recording.getFileUrl(),
                    recording.getRecordingMediaType(),
                    recording.getHasVideo(),
                    recording.getMimeType(),
                    recording.getFileSizeBytes(),
                    recording.getDurationSec(),
                    recording.getCreatedAt()
            );
        }

        GroupCallSession groupSession = groupCallSessionRepository.findByCallId(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call session not found: " + callId));
        boolean isGroupMember = chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(
                groupSession.getConversation().getId(),
                owner.getId()
        );
        if (!isGroupMember) {
            throw new ForbiddenException("You are not a participant of this group call");
        }

        boolean hasVideoBySession = MEDIA_TYPE_VIDEO.equalsIgnoreCase(groupSession.getCallMediaType());
        boolean hasVideo = hasVideoByFile || hasVideoBySignal || hasVideoBySession;
        String recordingMediaType = hasVideo ? MEDIA_TYPE_VIDEO : MEDIA_TYPE_AUDIO;
        String fileUrl = cloudinaryService.uploadCallRecording(file, callId.toString());

        GroupCallRecording recording = GroupCallRecording.builder()
                .groupCallSession(groupSession)
                .ownerUser(owner)
                .fileUrl(fileUrl)
                .recordingMediaType(recordingMediaType)
                .hasVideo(hasVideo)
                .mimeType(contentType)
                .fileSizeBytes(file.getSize())
                .durationSec(safeDurationSec)
                .createdAt(LocalDateTime.now())
                .build();
        recording = groupCallRecordingRepository.save(recording);

        return toResponse(
                recording.getId(),
                groupSession.getCallId(),
                owner.getId(),
                recording.getFileUrl(),
                recording.getRecordingMediaType(),
                recording.getHasVideo(),
                recording.getMimeType(),
                recording.getFileSizeBytes(),
                recording.getDurationSec(),
                recording.getCreatedAt()
        );
    }

    private CallRecordingResponse toResponse(
            UUID recordingId,
            UUID callId,
            UUID ownerUserId,
            String fileUrl,
            String recordingMediaType,
            Boolean hasVideo,
            String mimeType,
            Long fileSizeBytes,
            Integer durationSec,
            LocalDateTime createdAt
    ) {
        return CallRecordingResponse.builder()
                .id(recordingId)
                .callId(callId)
                .ownerUserId(ownerUserId)
                .fileUrl(fileUrl)
                .recordingMediaType(recordingMediaType)
                .hasVideo(hasVideo)
                .mimeType(mimeType)
                .fileSizeBytes(fileSizeBytes)
                .durationSec(durationSec)
                .createdAt(createdAt)
                .build();
    }
}
