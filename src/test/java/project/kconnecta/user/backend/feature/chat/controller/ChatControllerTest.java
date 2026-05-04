package project.kconnecta.user.backend.feature.chat.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.feature.chat.service.CallRecordingService;
import project.kconnecta.user.backend.feature.chat.service.ChatService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ChatService chatService;
    @Mock
    private CallRecordingService callRecordingService;
    @Mock
    private CloudinaryService cloudinaryService;

    @InjectMocks
    private ChatController controller;

    @Test
    void uploadCallRecording_withoutPrincipal_shouldReturnUnauthorized() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "record.webm",
                "video/webm",
                "abc".getBytes()
        );

        var response = controller.uploadCallRecording(
                UUID.randomUUID(),
                file,
                30,
                "video",
                null
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(callRecordingService);
    }
}
