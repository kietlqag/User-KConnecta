package project.kconnecta.user.backend.feature.support.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.support.dto.request.CreateSupportRequest;
import project.kconnecta.user.backend.feature.support.dto.response.SupportRequestResponse;
import project.kconnecta.user.backend.feature.support.service.SupportRequestService;

import java.util.List;

@RestController
@RequestMapping("/api/support-requests")
@RequiredArgsConstructor
public class SupportRequestController {

    private final SupportRequestService supportRequestService;

    /** Người dùng gửi yêu cầu trợ giúp / hỗ trợ cho admin. */
    @PostMapping
    public ResponseEntity<SupportRequestResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateSupportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(supportRequestService.create(principal.getUserId(), request));
    }

    /** Danh sách yêu cầu của chính người dùng (xem lại lịch sử đã gửi). */
    @GetMapping("/mine")
    public ResponseEntity<List<SupportRequestResponse>> getMine(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(supportRequestService.getMine(principal.getUserId()));
    }
}
