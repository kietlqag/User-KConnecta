package project.kconnecta.user.backend.feature.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.feature.auth.dto.request.*;
import project.kconnecta.user.backend.feature.auth.dto.response.AuthResponse;
import project.kconnecta.user.backend.feature.auth.service.AuthService;
import project.kconnecta.user.backend.feature.auth.service.OtpService;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final OtpService otpService;
    private final AuthService authService;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        otpService.sendOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP đã được gửi đến " + request.getEmail()));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        otpService.verifyOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of("verified", true));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
