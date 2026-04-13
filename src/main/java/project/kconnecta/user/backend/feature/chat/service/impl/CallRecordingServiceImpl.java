package project.kconnecta.user.backend.feature.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.chat.dto.response.CallRecordingResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallRecording;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.repository.CallRecordingRepository;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
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
    private final CallRecordingRepository callRecordingRepository;
    private final CloudinaryService cloudinaryService;

    @Override
    @Transactional
    public CallRecordingResponse saveRecording(UUID callId, String username, MultipartFile file, Integer durationSec, String mediaType) {
        if (username == null || username.isBlank()) {
            throw new ValidationException("Unauthenticated request");
        }
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Recording file is required");
        }
        if (file.getSize() > MAX_RECORDING_SIZE_BYTES) {
            throw new ValidationException("Recording file is too large");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("audio/") && !contentType.startsWith("video/")) {
            throw new ValidationException("Unsupported recording content type");
        }

        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        CallSession session = callSessionRepository.findByCallId(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call session not found: " + callId));

        boolean isParticipant = session.getCaller().getId().equals(owner.getId()) || session.getCallee().getId().equals(owner.getId());
        if (!isParticipant) {
            throw new ValidationException("You are not a participant of this call");
        }

        boolean hasVideoByFile = contentType != null && contentType.startsWith("video/");
        boolean hasVideoBySignal = MEDIA_TYPE_VIDEO.equalsIgnoreCase(mediaType);
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
                .durationSec(durationSec == null ? null : Math.max(0, durationSec))
                .createdAt(LocalDateTime.now())
                .build();

        recording = callRecordingRepository.save(recording);

        return CallRecordingResponse.builder()
                .id(recording.getId())
                .callId(session.getCallId())
                .ownerUserId(owner.getId())
                .fileUrl(recording.getFileUrl())
                .recordingMediaType(recording.getRecordingMediaType())
                .hasVideo(recording.getHasVideo())
                .mimeType(recording.getMimeType())
                .fileSizeBytes(recording.getFileSizeBytes())
                .durationSec(recording.getDurationSec())
                .createdAt(recording.getCreatedAt())
                .build();
    }
}
