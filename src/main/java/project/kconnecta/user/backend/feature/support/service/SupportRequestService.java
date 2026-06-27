package project.kconnecta.user.backend.feature.support.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.common.util.MediaFileSniffer;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.support.dto.request.CreateSupportRequest;
import project.kconnecta.user.backend.feature.support.dto.response.SupportRequestResponse;
import project.kconnecta.user.backend.feature.support.entity.SupportRequest;
import project.kconnecta.user.backend.feature.support.entity.SupportRequestAttachment;
import project.kconnecta.user.backend.feature.support.repository.SupportRequestRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportRequestService {

    private static final int MAX_ATTACHMENTS = 5;
    private static final long MAX_ATTACHMENT_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final SupportRequestRepository supportRequestRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    @Transactional
    public SupportRequestResponse create(UUID userId, CreateSupportRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<MultipartFile> attachments = request.getAttachments() == null
                ? List.of()
                : request.getAttachments().stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();

        if (attachments.size() > MAX_ATTACHMENTS) {
            throw new ValidationException("Tối đa " + MAX_ATTACHMENTS + " ảnh minh chứng");
        }

        String contactEmail = user.getAccount() != null ? user.getAccount().getEmail() : null;

        SupportRequest saved = supportRequestRepository.save(SupportRequest.builder()
                .user(user)
                .contactEmail(contactEmail)
                .category(request.getCategory().trim())
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .status("PENDING")
                .build());

        for (MultipartFile file : attachments) {
            validateEvidenceImage(file);
            String imageUrl = cloudinaryService.uploadSupportEvidence(file);
            saved.getAttachments().add(SupportRequestAttachment.builder()
                    .supportRequest(saved)
                    .imageUrl(imageUrl)
                    .build());
        }

        if (!attachments.isEmpty()) {
            saved = supportRequestRepository.save(saved);
        }

        return SupportRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SupportRequestResponse> getMine(UUID userId) {
        return supportRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SupportRequestResponse::from)
                .toList();
    }

    private void validateEvidenceImage(MultipartFile file) {
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new ValidationException("Ảnh minh chứng tối đa 5MB");
        }
        if (!MediaFileSniffer.isAllowedImage(file, ALLOWED_IMAGE_EXTENSIONS)) {
            throw new ValidationException("Chỉ hỗ trợ ảnh JPG, PNG, WEBP");
        }
    }
}
