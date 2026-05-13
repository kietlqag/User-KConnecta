package project.kconnecta.user.backend.feature.page.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.page.dto.request.CreatePageRequest;
import project.kconnecta.user.backend.feature.page.dto.response.PageResponse;
import project.kconnecta.user.backend.feature.page.service.PageService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;

    @PostMapping
    public ResponseEntity<PageResponse> createPage(@Valid @RequestBody CreatePageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pageService.createPage(request));
    }

    @GetMapping("/managed")
    public ResponseEntity<List<PageResponse>> getManagedPages(@RequestParam UUID userId) {
        return ResponseEntity.ok(pageService.getManagedPages(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PageResponse> getPageById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(pageService.getPageById(id));
    }
}

