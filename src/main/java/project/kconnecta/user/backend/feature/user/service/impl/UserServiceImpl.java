package project.kconnecta.user.backend.feature.user.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
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
    @Override
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username already exists");
        }

        String normalizedGender = request.getGender() == null
                ? null
                : request.getGender().trim().toUpperCase();

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .fullName(request.getFullName())
                .bio(request.getBio())
                .gender(normalizedGender)
                .location(request.getLocation())
                .passwordHash(request.getPasswordHash())
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
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (userRepository.existsByEmail(request.getEmail())
                && !user.getEmail().equals(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        if (userRepository.existsByUsername(request.getUsername())
                && !user.getUsername().equals(request.getUsername())) {
            throw new DuplicateResourceException("Username already exists");
        }
        String normalizedGender = request.getGender() == null
                ? null
                : request.getGender().trim().toUpperCase();

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setBio(request.getBio());
        user.setGender(normalizedGender);
        user.setLocation(request.getLocation());
        user.setPasswordHash(request.getPasswordHash());
        user.setDateOfBirth(request.getDateOfBirth());

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
                .email(user.getEmail())
                .fullName(user.getFullName())
                .bio(user.getBio())
                .gender(user.getGender())
                .location(user.getLocation())
                .dateOfBirth(user.getDateOfBirth())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}


