package project.kconnecta.user.backend.feature.collection.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.collection.dto.request.AddCollectionItemRequest;
import project.kconnecta.user.backend.feature.collection.dto.request.CreateCollectionRequest;
import project.kconnecta.user.backend.feature.collection.dto.response.CollectionResponse;
import project.kconnecta.user.backend.feature.collection.service.CollectionService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/collections")
@RequiredArgsConstructor
public class CollectionController {

    private final CollectionService collectionService;

    @GetMapping
    public ResponseEntity<List<CollectionResponse>> getCollections(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(collectionService.getCollections(principal.getUserId()));
    }

    @PostMapping
    public ResponseEntity<CollectionResponse> createCollection(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateCollectionRequest request) {
        request.setUserId(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(collectionService.createCollection(request));
    }

    @PostMapping("/{collectionId}/items")
    public ResponseEntity<Void> addItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID collectionId,
            @Valid @RequestBody AddCollectionItemRequest request) {
        request.setUserId(principal.getUserId());
        collectionService.addItem(collectionId, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{collectionId}/items")
    public ResponseEntity<Void> removeItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID collectionId,
            @RequestParam UUID postId) {
        collectionService.removeItem(collectionId, principal.getUserId(), postId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{collectionId}/post-ids")
    public ResponseEntity<List<UUID>> getCollectionPostIds(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID collectionId) {
        return ResponseEntity.ok(collectionService.getCollectionPostIds(collectionId, principal.getUserId()));
    }

    @GetMapping("/by-item")
    public ResponseEntity<List<UUID>> getCollectionIdsByItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID postId) {
        return ResponseEntity.ok(collectionService.getCollectionIdsByItem(principal.getUserId(), postId));
    }
}
