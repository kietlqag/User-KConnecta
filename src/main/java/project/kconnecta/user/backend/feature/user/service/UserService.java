package project.kconnecta.user.backend.feature.user.service;

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
}