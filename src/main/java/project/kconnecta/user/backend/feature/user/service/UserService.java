package project.kconnecta.user.backend.feature.user.service;

import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.user.dto.request.CreateUserRequest;
import project.kconnecta.user.backend.feature.user.dto.request.UpdateUserRequest;
import project.kconnecta.user.backend.feature.user.dto.response.UserResponse;

import java.util.List;
import java.util.UUID;

public interface UserService {
    UserResponse createUser(CreateUserRequest request);
    List<UserResponse> getAllUsers();
    UserResponse getUserById(UUID id);
    UserResponse getUserByUsername(String username);
    UserResponse updateUser(UUID id, UpdateUserRequest request);
    void deleteUser(UUID id);
    UserResponse uploadAvatar(UUID id, MultipartFile file);
    UserResponse uploadCoverPhoto(UUID id, MultipartFile file);
}