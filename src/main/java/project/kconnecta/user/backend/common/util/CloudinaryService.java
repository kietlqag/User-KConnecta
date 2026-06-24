package project.kconnecta.user.backend.common.util;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public String uploadAvatar(MultipartFile file) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/avatars"
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload avatar failed", e);
        }
    }

    public String uploadCover(MultipartFile file) {
        try {
            log.info("Uploading cover photo to Cloudinary, size={} bytes, contentType={}", file.getSize(), file.getContentType());
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/covers"
                    )
            );
            String url = result.get("secure_url").toString();
            log.info("Cover photo uploaded successfully: {}", url);
            return url;
        } catch (IOException e) {
            log.error("Failed to upload cover photo to Cloudinary", e);
            throw new RuntimeException("Upload cover photo failed: " + e.getMessage(), e);
        }
    }

    public String uploadStory(MultipartFile file) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/stories"
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload story media failed", e);
        }
    }

    public String uploadChatImage(MultipartFile file) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/chat-images",
                            "resource_type", "image",
                            "public_id", "chat-image-" + UUID.randomUUID()
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload chat image failed", e);
        }
    }

    public String uploadPostImage(MultipartFile file) {
        try {
            String contentType = file.getContentType();
            boolean isRaw = contentType != null
                    && !contentType.startsWith("image/")
                    && !contentType.startsWith("video/");
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", isRaw ? "kconnecta/post-files" : "kconnecta/post-images",
                            "resource_type", isRaw ? "raw" : "auto",
                            "public_id", "post-media-" + UUID.randomUUID()
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload post media failed", e);
        }
    }

    public String uploadAlbumMedia(MultipartFile file, String mediaType) {
        try {
            boolean isVideo = "VIDEO".equalsIgnoreCase(mediaType);
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/albums",
                            "resource_type", isVideo ? "video" : "image",
                            "public_id", "album-" + mediaType.toLowerCase() + "-" + UUID.randomUUID()
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload album media failed", e);
        }
    }

    public String uploadChatFile(MultipartFile file) {
        try {
            String publicId = "chat-file-" + System.currentTimeMillis() + "-" + normalizeFilename(file.getOriginalFilename());
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/chat-files",
                            "resource_type", "raw",
                            "public_id", publicId
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload chat file failed", e);
        }
    }

    public String uploadLiveRecording(MultipartFile file, String sessionId) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/live-recordings",
                            "resource_type", "video",
                            "public_id", "live-" + sessionId + "-" + System.currentTimeMillis()
                    )
            );
            return result.get("secure_url").toString();
        } catch (Exception e) {
            log.error("Upload live recording failed for session {} (size={} bytes, type={})",
                    sessionId, file.getSize(), file.getContentType(), e);
            throw new RuntimeException("Upload live recording failed: " + e.getMessage(), e);
        }
    }

    public String uploadVoiceMessage(MultipartFile file) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/voice-messages",
                            "resource_type", "video",
                            "public_id", "voice-" + System.currentTimeMillis()
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload voice message failed", e);
        }
    }

    public String uploadChatVideo(MultipartFile file) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/chat-videos",
                            "resource_type", "video",
                            "public_id", "chat-video-" + System.currentTimeMillis()
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload chat video failed", e);
        }
    }

    public void deleteImageByUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        String publicId = extractPublicId(imageUrl);
        if (publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            throw new RuntimeException("Delete old image failed", e);
        }
    }

    private String extractPublicId(String imageUrl) {
        try {
            String marker = "/upload/";
            int uploadIndex = imageUrl.indexOf(marker);
            if (uploadIndex == -1) {
                return null;
            }

            String pathAfterUpload = imageUrl.substring(uploadIndex + marker.length());

            String[] parts = pathAfterUpload.split("/");
            int startIndex = 0;

            if (parts.length > 0 && parts[0].matches("v\\d+")) {
                startIndex = 1;
            }

            StringBuilder publicIdBuilder = new StringBuilder();
            for (int i = startIndex; i < parts.length; i++) {
                if (i > startIndex) {
                    publicIdBuilder.append("/");
                }
                publicIdBuilder.append(parts[i]);
            }

            String publicIdWithExtension = publicIdBuilder.toString();
            int lastDotIndex = publicIdWithExtension.lastIndexOf(".");
            if (lastDotIndex == -1) {
                return publicIdWithExtension;
            }

            return publicIdWithExtension.substring(0, lastDotIndex);
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizeFilename(String originalFilename) {
        String fallback = "file";
        if (originalFilename == null || originalFilename.isBlank()) {
            return fallback;
        }

        String sanitized = originalFilename
                .trim()
                .replace("\\", "-")
                .replace("/", "-")
                .replaceAll("[^A-Za-z0-9._-]", "-")
                .replaceAll("-+", "-");

        if (sanitized.equals(".") || sanitized.equals("..") || sanitized.isBlank()) {
            return fallback;
        }
        return sanitized;
    }
}
