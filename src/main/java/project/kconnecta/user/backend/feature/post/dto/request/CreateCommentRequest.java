package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateCommentRequest {

    @NotNull
    private UUID userId;

    // Cho phép rỗng nếu bình luận chỉ có ảnh — service kiểm tra "content HOẶC imageUrl".
    private String content;

    private String imageUrl;

    private UUID parentCommentId;
}
