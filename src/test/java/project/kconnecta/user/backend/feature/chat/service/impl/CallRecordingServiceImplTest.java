package project.kconnecta.user.backend.feature.chat.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversation;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallRecording;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallSession;
import project.kconnecta.user.backend.feature.chat.repository.CallRecordingRepository;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationMemberRepository;
import project.kconnecta.user.backend.feature.chat.repository.GroupCallRecordingRepository;
import project.kconnecta.user.backend.feature.chat.repository.GroupCallSessionRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CallRecordingServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CallSessionRepository callSessionRepository;
    @Mock
    private GroupCallSessionRepository groupCallSessionRepository;
    @Mock
    private ChatConversationMemberRepository chatConversationMemberRepository;
    @Mock
    private CallRecordingRepository callRecordingRepository;
    @Mock
    private GroupCallRecordingRepository groupCallRecordingRepository;
    @Mock
    private CloudinaryService cloudinaryService;

    @InjectMocks
    private CallRecordingServiceImpl service;

    @Test
    void saveRecording_groupCallMember_shouldSaveGroupRecording() {
        UUID callId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();

        User owner = User.builder().id(userId).username("alice").fullName("Alice").build();
        ChatConversation conversation = ChatConversation.builder().id(conversationId).name("group").createdBy(owner).build();
        GroupCallSession groupSession = GroupCallSession.builder()
                .id(UUID.randomUUID())
                .callId(callId)
                .conversation(conversation)
                .caller(owner)
                .status("ONGOING")
                .callMediaType("video")
                .startedAt(LocalDateTime.now())
                .build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(owner));
        when(callSessionRepository.findByCallId(callId)).thenReturn(Optional.empty());
        when(groupCallSessionRepository.findByCallId(callId)).thenReturn(Optional.of(groupSession));
        when(chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(true);
        when(cloudinaryService.uploadCallRecording(any(), eq(callId.toString()))).thenReturn("https://cdn/record.webm");
        when(groupCallRecordingRepository.save(any(GroupCallRecording.class))).thenAnswer(invocation -> {
            GroupCallRecording value = invocation.getArgument(0);
            value.setId(UUID.randomUUID());
            return value;
        });

        MockMultipartFile file = new MockMultipartFile("file", "record.webm", "video/webm", "abc".getBytes());
        var response = service.saveRecording(callId, "alice", file, 60, "video");

        assertThat(response.getCallId()).isEqualTo(callId);
        assertThat(response.getOwnerUserId()).isEqualTo(userId);
        assertThat(response.getFileUrl()).isEqualTo("https://cdn/record.webm");
        assertThat(response.getRecordingMediaType()).isEqualTo("video");
        verify(groupCallRecordingRepository).save(any(GroupCallRecording.class));
        verify(callRecordingRepository, never()).save(any());
    }

    @Test
    void saveRecording_groupCallNonMember_shouldThrowForbidden() {
        UUID callId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();

        User owner = User.builder().id(userId).username("alice").fullName("Alice").build();
        ChatConversation conversation = ChatConversation.builder().id(conversationId).name("group").createdBy(owner).build();
        GroupCallSession groupSession = GroupCallSession.builder()
                .id(UUID.randomUUID())
                .callId(callId)
                .conversation(conversation)
                .caller(owner)
                .status("ONGOING")
                .callMediaType("audio")
                .startedAt(LocalDateTime.now())
                .build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(owner));
        when(callSessionRepository.findByCallId(callId)).thenReturn(Optional.empty());
        when(groupCallSessionRepository.findByCallId(callId)).thenReturn(Optional.of(groupSession));
        when(chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(false);

        MockMultipartFile file = new MockMultipartFile("file", "record.webm", "audio/webm", "abc".getBytes());
        assertThatThrownBy(() -> service.saveRecording(callId, "alice", file, 10, "audio"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("not a participant");
    }

    @Test
    void saveRecording_callNotFound_shouldThrowNotFound() {
        UUID callId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User owner = User.builder().id(userId).username("alice").fullName("Alice").build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(owner));
        when(callSessionRepository.findByCallId(callId)).thenReturn(Optional.empty());
        when(groupCallSessionRepository.findByCallId(callId)).thenReturn(Optional.empty());

        MockMultipartFile file = new MockMultipartFile("file", "record.webm", "video/webm", "abc".getBytes());
        assertThatThrownBy(() -> service.saveRecording(callId, "alice", file, 10, "video"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Call session not found");
    }
}
