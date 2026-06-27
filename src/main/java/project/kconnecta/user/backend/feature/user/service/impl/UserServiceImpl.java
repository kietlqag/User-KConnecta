package project.kconnecta.user.backend.feature.user.service.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.DisplayNameValidator;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.common.util.MediaFileSniffer;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;
import project.kconnecta.user.backend.feature.auth.service.RefreshTokenService;
import project.kconnecta.user.backend.feature.user.dto.request.UpdateUserRequest;
import project.kconnecta.user.backend.feature.user.dto.response.UserResponse;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import project.kconnecta.user.backend.feature.user.service.UserService;

import java.util.Set;
import java.util.Objects;
import java.util.UUID;

/*
 * Cache strategy
 * ──────────────
 * Two separate caches to allow precise eviction without nuking everything:
 *
 *   "userById"       — keyed by UUID  → used by getUserById / updateUser / delete
 *   "userByUsername" — keyed by String username → used by getUserByUsername
 *
 * Rules:
 *   READ   → @Cacheable   (return cached value, skip method body on hit)
 *   WRITE  → @CachePut    (always run method, store result in cache)
 *   DELETE → programmatic evict via CacheManager (void return, need old username)
 *
 * Why programmatic evict for delete/update-username?
 *   @CacheEvict(key="#username") requires the key as a method parameter.
 *   For delete/update we only have #id as a parameter; the username lives in the
 *   DB row we fetch inside the method. Injecting CacheManager lets us evict the
 *   exact old-username key without wiping the entire cache (allEntries = true).
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final CloudinaryService cloudinaryService;
    private final CacheManager cacheManager;
    private final RefreshTokenService refreshTokenService;

    // -------------------------------------------------------------------------
    // READ
    // -------------------------------------------------------------------------

    @Override
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Cacheable(cacheNames = "userById", key = "#id")
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToResponse(user);
    }

    @Override
    @Cacheable(cacheNames = "userByUsername", key = "#username")
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return mapToResponse(user);
    }

    @Override
    public UserResponse getUserByIdOrUsername(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("User identifier is required");
        }
        String normalized = identifier.trim();
        try {
            return getUserById(UUID.fromString(normalized));
        } catch (IllegalArgumentException ignored) {
            return getUserByUsername(normalized);
        }
    }

    // -------------------------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------------------------

    /*
     * @CachePut on both caches ensures the saved state is immediately reflected.
     * If the username changed we also evict the OLD username key so no stale
     * entry lingers under the previous name.
     */
    @Override
    @Transactional
    @Caching(put = {
            @CachePut(cacheNames = "userById",       key = "#result.id"),
            @CachePut(cacheNames = "userByUsername", key = "#result.username")
    })
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (request.getEmail() != null
                && !user.getAccount().getEmail().equals(request.getEmail())
                && accountRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        String oldUsername = user.getUsername();

        if (request.getUsername() != null
                && !user.getUsername().equals(request.getUsername())
                && userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username already exists");
        }

        String normalizedGender = request.getGender() == null
                ? null : request.getGender().trim().toUpperCase();

        if (request.getUsername()           != null) user.setUsername(request.getUsername());
        if (request.getEmail()              != null) user.getAccount().setEmail(request.getEmail());
        if (request.getFullName()           != null) user.setFullName(DisplayNameValidator.requireSafe(request.getFullName()));
        if (request.getBio()                != null) user.setBio(request.getBio());
        if (request.getGender()             != null) user.setGender(normalizedGender);
        if (request.getLocation()           != null) user.setLocation(request.getLocation());
        if (request.getHometown()           != null) user.setHometown(request.getHometown());
        if (request.getRelationshipStatus() != null) user.setRelationshipStatus(request.getRelationshipStatus());
        if (request.getSchool()             != null) user.setSchool(request.getSchool());
        if (request.getWorkplace()          != null) user.setWorkplace(request.getWorkplace());
        if (request.getJobTitle()           != null) user.setJobTitle(request.getJobTitle());
        if (request.getPhoneNumber()        != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getWebsite()            != null) user.setWebsite(request.getWebsite());
        if (request.getDateOfBirth()        != null) user.setDateOfBirth(request.getDateOfBirth());
        if (request.getAvatarUrl()          != null) user.setAvatarUrl(request.getAvatarUrl());
        if (request.getCoverPhotoUrl()      != null) user.setCoverPhotoUrl(request.getCoverPhotoUrl());

        UserResponse response = mapToResponse(userRepository.save(user));

        // Evict the old username key only when it actually changed.
        // The new username is already handled by @CachePut(key="#result.username") above.
        if (!oldUsername.equals(response.getUsername())) {
            evict("userByUsername", oldUsername);
        }

        return response;
    }

    // -------------------------------------------------------------------------
    // DELETE
    // -------------------------------------------------------------------------

    /*
     * Void return → @CacheEvict(key="#username") is not usable here because the
     * username is not a method parameter. We fetch the entity first, then delete,
     * then evict both keys programmatically.
     */
    @Override
    @Transactional
    public void deleteAccount(UUID id, String password) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        Account account = user.getAccount();
        if (account.getPasswordHash() != null && !account.getPasswordHash().isBlank()) {
            if (password == null || password.isBlank()) {
                throw new ValidationException("Vui lòng nhập mật khẩu để xác nhận xóa tài khoản");
            }
            if (!passwordEncoder.matches(password, account.getPasswordHash())) {
                throw new ValidationException("Mật khẩu không đúng");
            }
        }

        refreshTokenService.revokeAllForUser(id);
        deleteUser(id);
    }

    @Override
    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        String username = user.getUsername();
        userRepository.delete(user);

        evict("userById",       id);
        evict("userByUsername", username);
    }

    // -------------------------------------------------------------------------
    // MEDIA UPLOADS  (also write-through to keep both caches fresh)
    // -------------------------------------------------------------------------

    @Override
    @Transactional
    @Caching(put = {
            @CachePut(cacheNames = "userById",       key = "#result.id"),
            @CachePut(cacheNames = "userByUsername", key = "#result.username")
    })
    public UserResponse uploadAvatar(UUID id, MultipartFile file) {
        validateImage(file);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        String oldAvatarUrl = user.getAvatarUrl();
        user.setAvatarUrl(cloudinaryService.uploadAvatar(file));
        User saved = userRepository.save(user);

        if (oldAvatarUrl != null && !oldAvatarUrl.isBlank()) {
            cloudinaryService.deleteImageByUrl(oldAvatarUrl);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    @Caching(put = {
            @CachePut(cacheNames = "userById",       key = "#result.id"),
            @CachePut(cacheNames = "userByUsername", key = "#result.username")
    })
    public UserResponse uploadCoverPhoto(UUID id, MultipartFile file) {
        validateImage(file);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        String oldCoverUrl = user.getCoverPhotoUrl();
        user.setCoverPhotoUrl(cloudinaryService.uploadCover(file));
        User saved = userRepository.save(user);

        if (oldCoverUrl != null && !oldCoverUrl.isBlank()) {
            cloudinaryService.deleteImageByUrl(oldCoverUrl);
        }

        return mapToResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void evict(String cacheName, Object key) {
        String name = Objects.requireNonNull(cacheName);
        Object k = Objects.requireNonNull(key);
        Cache cache = cacheManager.getCache(name);
        if (cache != null) {
            cache.evict(k);
        }
    }

    private static final Set<String> AVATAR_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("File size must be less than 5MB");
        }
        if (!MediaFileSniffer.isAllowedImage(file, AVATAR_IMAGE_EXTENSIONS)) {
            throw new RuntimeException("Only JPG, PNG, WEBP are allowed");
        }
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getAccount().getEmail())
                .accountStatus(user.getAccount().getStatus())
                .fullName(user.getFullName())
                .bio(user.getBio())
                .gender(user.getGender())
                .location(user.getLocation())
                .hometown(user.getHometown())
                .relationshipStatus(user.getRelationshipStatus())
                .school(user.getSchool())
                .workplace(user.getWorkplace())
                .jobTitle(user.getJobTitle())
                .phoneNumber(user.getPhoneNumber())
                .website(user.getWebsite())
                .dateOfBirth(user.getDateOfBirth())
                .avatarUrl(user.getAvatarUrl())
                .coverPhotoUrl(user.getCoverPhotoUrl())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
