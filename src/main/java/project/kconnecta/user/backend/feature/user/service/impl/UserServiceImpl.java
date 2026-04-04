package project.kconnecta.user.backend.feature.user.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.auth.repository.AccountRepository;
import project.kconnecta.user.backend.feature.user.dto.request.CreateUserRequest;
import project.kconnecta.user.backend.feature.user.dto.request.UpdateUserRequest;
import project.kconnecta.user.backend.feature.user.dto.response.UserResponse;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import project.kconnecta.user.backend.feature.user.service.UserService;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public UserResponse createUser(CreateUserRequest request) {
        if (accountRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username already exists");
        }

        String normalizedGender = request.getGender() == null
                ? null
                : request.getGender().trim().toUpperCase();

        Account account = Account.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status(AccountStatus.ACTIVE)
                .build();

        User user = User.builder()
                .username(request.getUsername())
                .account(account)
                .fullName(request.getFullName())
                .bio(request.getBio())
                .gender(normalizedGender)
                .location(request.getLocation())
                .hometown(request.getHometown())
                .relationshipStatus(request.getRelationshipStatus())
                .school(request.getSchool())
                .dateOfBirth(request.getDateOfBirth())
                .build();

        return mapToResponse(userRepository.save(user));
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        return mapToResponse(user);
    }

    @Override
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        return mapToResponse(user);
    }

    @Override
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (request.getEmail() != null
                && accountRepository.existsByEmail(request.getEmail())
                && !user.getAccount().getEmail().equals(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        if (request.getUsername() != null
                && userRepository.existsByUsername(request.getUsername())
                && !user.getUsername().equals(request.getUsername())) {
            throw new DuplicateResourceException("Username already exists");
        }

        String normalizedGender = request.getGender() == null
                ? null
                : request.getGender().trim().toUpperCase();

        if (request.getUsername() != null) {
            user.setUsername(request.getUsername());
        }
        if (request.getEmail() != null) {
            user.getAccount().setEmail(request.getEmail());
        }
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getGender() != null) {
            user.setGender(normalizedGender);
        }
        if (request.getLocation() != null) {
            user.setLocation(request.getLocation());
        }
        if (request.getHometown() != null) {
            user.setHometown(request.getHometown());
        }
        if (request.getRelationshipStatus() != null) {
            user.setRelationshipStatus(request.getRelationshipStatus());
        }
        if (request.getSchool() != null) {
            user.setSchool(request.getSchool());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getCoverPhotoUrl() != null) {
            user.setCoverPhotoUrl(request.getCoverPhotoUrl());
        }

        return mapToResponse(userRepository.save(user));
    }

    @Override
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        userRepository.delete(user);
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
                .dateOfBirth(user.getDateOfBirth())
                .avatarUrl(user.getAvatarUrl())
                .coverPhotoUrl(user.getCoverPhotoUrl())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
