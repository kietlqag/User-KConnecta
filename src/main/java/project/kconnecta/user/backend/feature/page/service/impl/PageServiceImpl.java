package project.kconnecta.user.backend.feature.page.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.page.dto.request.CreatePageRequest;
import project.kconnecta.user.backend.feature.page.dto.response.PageResponse;
import project.kconnecta.user.backend.feature.page.entity.Page;
import project.kconnecta.user.backend.feature.page.repository.PageRepository;
import project.kconnecta.user.backend.feature.page.service.PageService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PageServiceImpl implements PageService {

    private final PageRepository pageRepository;
    private final UserRepository userRepository;

    @Override
    public PageResponse createPage(CreatePageRequest request) {
        User creator = userRepository.findById(request.getCreatorId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getCreatorId()));

        Page page = Page.builder()
                .name(request.getName())
                .description(request.getDescription())
                .avatarUrl(request.getAvatarUrl())
                .createdBy(creator)
                .build();

        return toResponse(pageRepository.save(page));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PageResponse> getManagedPages(UUID userId) {
        return pageRepository.findAllByCreatedByIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse getPageById(UUID pageId) {
        Page page = pageRepository.findById(pageId)
                .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + pageId));
        return toResponse(page);
    }

    private PageResponse toResponse(Page page) {
        return PageResponse.builder()
                .id(page.getId())
                .name(page.getName())
                .description(page.getDescription())
                .avatarUrl(page.getAvatarUrl())
                .createdBy(page.getCreatedBy().getId())
                .updatedAt(page.getUpdatedAt())
                .build();
    }
}

