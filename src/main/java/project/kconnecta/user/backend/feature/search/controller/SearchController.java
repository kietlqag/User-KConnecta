package project.kconnecta.user.backend.feature.search.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.search.dto.response.SearchResultsResponse;
import project.kconnecta.user.backend.feature.search.dto.response.SearchSuggestionResponse;
import project.kconnecta.user.backend.feature.search.service.SearchService;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Validated
public class SearchController {

    private final SearchService searchService;

    /** Autocomplete suggestions (debounced from the header search bar). */
    @GetMapping("/suggest")
    public ResponseEntity<List<SearchSuggestionResponse>> suggest(
            @RequestParam @NotBlank @Size(min = 1, max = 100) String q,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                searchService.suggest(q.trim(), principal == null ? null : principal.getUserId()));
    }

    /** Full search — returns people, groups, posts matching the query. */
    @GetMapping
    public ResponseEntity<SearchResultsResponse> search(
            @RequestParam @NotBlank @Size(min = 1, max = 100) String q,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(searchService.search(q.trim(), principal.getUserId()));
    }
}
