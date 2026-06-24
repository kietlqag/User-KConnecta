package project.kconnecta.user.backend.feature.auth.service;

import java.util.UUID;

public interface RefreshTokenService {

    /** Cấp refresh token mới cho (userId, sid); trả về chuỗi token dạng thô để gửi cho client. */
    String issue(UUID userId, UUID sid);

    /** Xoay vòng: validate rawToken, vô hiệu token cũ, cấp token mới. */
    RotationResult rotate(String rawRefreshToken);

    /** Thu hồi một phiên (logout). */
    void revoke(UUID sid);

    /** Thu hồi toàn bộ phiên của user (đổi mật khẩu / khóa tài khoản). */
    void revokeAllForUser(UUID userId);

    record RotationResult(UUID userId, UUID sid, String newRefreshToken) {}
}
