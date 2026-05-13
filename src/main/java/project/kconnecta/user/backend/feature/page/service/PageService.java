package project.kconnecta.user.backend.feature.page.service;

import project.kconnecta.user.backend.feature.page.dto.request.CreatePageRequest;
import project.kconnecta.user.backend.feature.page.dto.response.PageResponse;

import java.util.List;
import java.util.UUID;

public interface PageService {
    PageResponse createPage(CreatePageRequest request);
    List<PageResponse> getManagedPages(UUID userId);
    PageResponse getPageById(UUID pageId);
}

