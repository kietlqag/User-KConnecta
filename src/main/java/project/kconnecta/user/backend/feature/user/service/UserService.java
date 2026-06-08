package project.kconnecta.user.backend.feature.user.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.user.dto.request.UpdateUserRequest;
import project.kconnecta.user.backend.feature.user.dto.response.UserResponse;

import java.util.UUID;

public interface UserService {
    Page<UserResponse> getAllUsers(Pageable pageable);
    UserResponse getUserById(UUID id);
    UserResponse getUserByUsername(String username);
    UserResponse getUserByIdOrUsername(String identifier);
    UserResponse updateUser(UUID id, UpdateUserRequest request);
    void deleteUser(UUID id);
    UserResponse uploadAvatar(UUID id, MultipartFile file);
    UserResponse uploadCoverPhoto(UUID id, MultipartFile file);
}