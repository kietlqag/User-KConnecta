package project.kconnecta.user.backend.feature.search.service;

import project.kconnecta.user.backend.feature.search.dto.response.SearchResultsResponse;
import project.kconnecta.user.backend.feature.search.dto.response.SearchSuggestionResponse;

import java.util.List;
import java.util.UUID;

public interface SearchService {
    List<SearchSuggestionResponse> suggest(String query, UUID currentUserId);
    SearchResultsResponse search(String query, UUID currentUserId);
}
