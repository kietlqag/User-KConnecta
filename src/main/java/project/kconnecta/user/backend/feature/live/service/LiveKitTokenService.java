package project.kconnecta.user.backend.feature.live.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.LiveKitTokenRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveKitTokenResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.repository.PostRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Service sinh Token truy cập (Access Token) cho LiveKit Server dưới dạng JWT mã hóa HMAC-SHA256.
 * Token này phân quyền người tham gia (Host được phép phát/publish, Viewer chỉ được phép xem/subscribe).
 */
@Service
@RequiredArgsConstructor
public class LiveKitTokenService {

    private final LiveSessionRepository liveSessionRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ObjectMapper objectMapper;

    @Value("${livekit.url:}")
    private String livekitUrl;

    @Value("${livekit.api-key:}")
    private String apiKey;

    @Value("${livekit.api-secret:}")
    private String apiSecret;

    @Value("${livekit.token-ttl-minutes:120}")
    private long tokenTtlMinutes;

    /**
     * Tạo Access Token hợp lệ cho người dùng tham gia phòng livestream.
     * 
     * @param request Yêu cầu chứa SessionId, UserId và Role (HOST/VIEWER)
     * @return Thông tin Token cùng URL kết nối LiveKit
     */
    public LiveKitTokenResponse createToken(LiveKitTokenRequest request) {
        LiveSession session = liveSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Live session not found: " + request.getSessionId()));
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));

        if (isBlank(livekitUrl) || isBlank(apiKey) || isBlank(apiSecret)) {
            throw new ValidationException("LiveKit is not configured");
        }

        boolean host = request.getRole() == LiveKitTokenRequest.LiveKitParticipantRole.HOST;
        // Kiểm tra quyền: Chỉ chủ phòng (Host) của session mới được phép publish stream
        if (host && !session.getHost().getId().equals(user.getId())) {
            throw new ValidationException("Only the host can publish this live session");
        }
        // Đối với Viewer: Phòng phải đang LIVE mới được tham gia xem
        if (!host && session.getStatus() != LiveSessionStatus.LIVE) {
            throw new ValidationException("This live session is not LIVE");
        }
        // Đối với Viewer: Phải có quyền xem bài viết (nếu live được gắn với 1 bài đăng Group/Friend)
        if (!host && !canViewLive(session, user)) {
            throw new ValidationException("You do not have permission to view this live session");
        }

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(tokenTtlMinutes);
        String token = buildJwt(session, user, host, expiresAt);

        return LiveKitTokenResponse.builder()
                .sessionId(session.getId())
                .userId(user.getId())
                .role(request.getRole().name())
                .roomName(session.getRoomName())
                .livekitUrl(livekitUrl)
                .token(token)
                .expiresAt(expiresAt)
                .build();
    }

    /**
     * Dựng và ký số JWT Token dành cho LiveKit theo chuẩn HMAC-SHA256.
     */
    private String buildJwt(LiveSession session, User user, boolean host, LocalDateTime expiresAt) {
        // Cấu hình các quyền (Grants) trong phòng LiveKit
        Map<String, Object> grants = Map.of(
                "roomJoin", true,               // Cho phép join phòng
                "room", session.getRoomName(),  // Tên phòng live
                "canPublish", host,             // Chỉ Host được phát hình/tiếng
                "canSubscribe", true,           // Cho phép đăng ký nhận luồng phát
                "canPublishData", true          // Cho phép truyền dữ liệu qua Data Channel
        );
        long issuedAt = System.currentTimeMillis() / 1000;
        long expiration = expiresAt.atZone(ZoneId.systemDefault()).toEpochSecond();
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        
        // GIẢI PHÁP ĐẶC BIỆT: LiveKit mặc định chỉ cho phép một kết nối cho mỗi identity (sub).
        // Nếu dùng trực tiếp userId làm identity, khi user mở 2 tab cùng lúc (hoặc host bật preview xem live của chính mình)
        // sẽ xảy ra hiện tượng đá kết nối liên tục làm màn hình chớp/giật.
        // Giải pháp: Thêm hậu tố ngẫu nhiên (UUID ngắn) để mỗi kết nối có một identity riêng biệt.
        String identity = user.getId() + "__" + (host ? "HOST" : "VIEWER") + "__"
                + java.util.UUID.randomUUID().toString().substring(0, 8);
                
        Map<String, Object> payload = new HashMap<>();
        payload.put("iss", apiKey);
        payload.put("sub", identity);
        payload.put("name", user.getFullName());
        payload.put("video", grants);
        payload.put("iat", issuedAt);
        payload.put("exp", expiration);

        try {
            // Encode Header & Payload dạng Base64URL
            String encodedHeader = base64Url(objectMapper.writeValueAsBytes(header));
            String encodedPayload = base64Url(objectMapper.writeValueAsBytes(payload));
            String signingInput = encodedHeader + "." + encodedPayload;
            
            // Ký số HMAC-SHA256 sử dụng LiveKit API Secret
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(apiSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String signature = base64Url(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
            return signingInput + "." + signature;
        } catch (JsonProcessingException e) {
            throw new ValidationException("Cannot serialize LiveKit token");
        } catch (Exception e) {
            throw new ValidationException("Cannot sign LiveKit token");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * Kiểm tra xem người dùng hiện tại có quyền xem phiên Livestream này hay không.
     * Dựa trên quyền riêng tư của bài viết đính kèm (PUBLIC/FRIENDS/Group members).
     */
    private boolean canViewLive(LiveSession session, User user) {
        if (session.getHost().getId().equals(user.getId())) {
            return true;
        }
        if (session.getPostId() != null) {
            return postRepository.isVisibleToUser(session.getPostId(), user.getId());
        }
        return session.getPrivacy() == PostPrivacy.PUBLIC;
    }

    private String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
