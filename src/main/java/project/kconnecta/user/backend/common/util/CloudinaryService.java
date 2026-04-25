package project.kconnecta.user.backend.common.util;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
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
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/covers"
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload cover photo failed", e);
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
                            "public_id", "chat-image-" + System.currentTimeMillis()
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload chat image failed", e);
        }
    }

    public String uploadCallRecording(MultipartFile file, String callId) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "kconnecta/call-recordings",
                            "resource_type", "video",
                            "public_id", "call-" + callId + "-" + System.currentTimeMillis()
                    )
            );
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Upload call recording failed", e);
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
}
