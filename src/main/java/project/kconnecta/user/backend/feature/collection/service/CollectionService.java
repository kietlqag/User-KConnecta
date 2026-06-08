package project.kconnecta.user.backend.feature.collection.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.collection.dto.request.AddCollectionItemRequest;
import project.kconnecta.user.backend.feature.collection.dto.request.CreateCollectionRequest;
import project.kconnecta.user.backend.feature.collection.dto.response.CollectionResponse;
import project.kconnecta.user.backend.feature.collection.entity.SavedCollection;
import project.kconnecta.user.backend.feature.collection.entity.SavedCollectionItem;
import project.kconnecta.user.backend.feature.collection.repository.SavedCollectionItemRepository;
import project.kconnecta.user.backend.feature.collection.repository.SavedCollectionRepository;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CollectionService {

    private final SavedCollectionRepository collectionRepository;
    private final SavedCollectionItemRepository itemRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;

    public List<CollectionResponse> getCollections(UUID userId) {
        return collectionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(col -> CollectionResponse.from(col, itemRepository.countByCollectionId(col.getId())))
                .toList();
    }

    @Transactional
    public CollectionResponse createCollection(CreateCollectionRequest request) {
        if (collectionRepository.existsByUserIdAndName(request.getUserId(), request.getName())) {
            throw new DuplicateResourceException("Tên bộ sưu tập đã tồn tại.");
        }
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        SavedCollection collection = SavedCollection.builder()
                .user(user)
                .name(request.getName())
                .build();
        collectionRepository.save(collection);
        return CollectionResponse.from(collection, 0);
    }

    @Transactional
    public void addItem(UUID collectionId, AddCollectionItemRequest request) {
        SavedCollection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
        if (!collection.getUser().getId().equals(request.getUserId())) {
            throw new ResourceNotFoundException("Collection not found");
        }
        if (itemRepository.existsByCollectionIdAndPostId(collectionId, request.getPostId())) {
            return;
        }
        Post post = postRepository.findById(request.getPostId())
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        itemRepository.save(SavedCollectionItem.builder()
                .collection(collection)
                .post(post)
                .build());
    }

    @Transactional
    public void removeItem(UUID collectionId, UUID userId, UUID postId) {
        SavedCollection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
        if (!collection.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Collection not found");
        }
        itemRepository.deleteByCollectionIdAndPostId(collectionId, postId);
    }

    public List<UUID> getCollectionIdsByItem(UUID userId, UUID postId) {
        return itemRepository.findCollectionIdsByUserIdAndPostId(userId, postId);
    }

    @Transactional(readOnly = true)
    public List<UUID> getCollectionPostIds(UUID collectionId, UUID userId) {
        SavedCollection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
        if (!collection.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Collection not found");
        }
        return itemRepository.findPostIdsByCollectionIdOrderByCreatedAtDesc(collectionId);
    }
}
