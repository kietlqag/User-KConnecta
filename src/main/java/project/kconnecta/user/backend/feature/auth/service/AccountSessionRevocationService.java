package project.kconnecta.user.backend.feature.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.settings.repository.UserLoginSessionRepository;

import java.time.LocalDateTime;
import java.util.UUID;

/** Thu hồi mọi phiên đăng nhập (DB + refresh token Redis) — dùng khi khóa tài khoản. */
@Service
@RequiredArgsConstructor
public class AccountSessionRevocationService {

    private final RefreshTokenService refreshTokenService;
    private final UserLoginSessionRepository userLoginSessionRepository;

    @Transactional
    public void revokeAllForUser(UUID userId) {
        refreshTokenService.revokeAllForUser(userId);
        LocalDateTime now = LocalDateTime.now();
        userLoginSessionRepository.findAllByUserIdAndRevokedAtIsNullOrderByLastSeenAtDesc(userId)
                .forEach(session -> {
                    if (session.getRevokedAt() == null) {
                        session.setRevokedAt(now);
                        userLoginSessionRepository.save(session);
                    }
                });
    }
}
