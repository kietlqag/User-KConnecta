package project.kconnecta.user.backend.feature.support.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.support.dto.request.CreateSupportRequest;
import project.kconnecta.user.backend.feature.support.dto.response.SupportRequestResponse;
import project.kconnecta.user.backend.feature.support.entity.SupportRequest;
import project.kconnecta.user.backend.feature.support.repository.SupportRequestRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportRequestService {

    private final SupportRequestRepository supportRequestRepository;
    private final UserRepository userRepository;

    @Transactional
    public SupportRequestResponse create(UUID userId, CreateSupportRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Chụp lại email liên hệ từ tài khoản để admin tiện phản hồi (account fetch LAZY → cần @Transactional).
        String contactEmail = user.getAccount() != null ? user.getAccount().getEmail() : null;

        SupportRequest saved = supportRequestRepository.save(SupportRequest.builder()
                .user(user)
                .contactEmail(contactEmail)
                .category(request.getCategory().trim())
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .status("PENDING")
                .build());

        return SupportRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SupportRequestResponse> getMine(UUID userId) {
        return supportRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SupportRequestResponse::from)
                .toList();
    }
}
