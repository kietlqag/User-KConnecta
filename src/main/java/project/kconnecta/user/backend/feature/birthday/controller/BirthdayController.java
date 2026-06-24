package project.kconnecta.user.backend.feature.birthday.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.birthday.dto.request.SendBirthdayWishRequest;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayFriendResponse;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayMonthGroupResponse;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayWishResponse;
import project.kconnecta.user.backend.feature.birthday.service.BirthdayService;

import java.util.List;

@RestController
@RequestMapping("/api/birthdays")
@RequiredArgsConstructor
public class BirthdayController {

    private final BirthdayService birthdayService;

    @GetMapping("/today")
    public ResponseEntity<List<BirthdayFriendResponse>> getTodayBirthdays(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(birthdayService.getTodayBirthdays(principal.getUserId()));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<BirthdayFriendResponse>> getUpcomingBirthdays(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(birthdayService.getUpcomingBirthdays(principal.getUserId(), days));
    }

    @GetMapping("/by-month")
    public ResponseEntity<List<BirthdayMonthGroupResponse>> getBirthdaysByMonth(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(birthdayService.getBirthdaysByMonth(principal.getUserId()));
    }

    @GetMapping("/friends")
    public ResponseEntity<List<BirthdayFriendResponse>> getAllFriendBirthdays(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(birthdayService.getAllFriendBirthdays(principal.getUserId()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<BirthdayFriendResponse>> searchFriendBirthdays(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(name = "q", defaultValue = "") String query) {
        return ResponseEntity.ok(birthdayService.searchFriendBirthdays(principal.getUserId(), query));
    }

    @PostMapping("/wishes")
    public ResponseEntity<BirthdayWishResponse> sendWish(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SendBirthdayWishRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(birthdayService.sendWish(principal.getUserId(), request));
    }

    @GetMapping("/wishes")
    public ResponseEntity<List<BirthdayWishResponse>> getWishHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "all") String direction,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(birthdayService.getWishHistory(principal.getUserId(), direction, limit));
    }
}
