package project.kconnecta.user.backend.feature.chat.service;

import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.chat.dto.response.CallRecordingResponse;

import java.util.UUID;

public interface CallRecordingService {
    CallRecordingResponse saveRecording(UUID callId, String username, MultipartFile file, Integer durationSec, String mediaType);
}
