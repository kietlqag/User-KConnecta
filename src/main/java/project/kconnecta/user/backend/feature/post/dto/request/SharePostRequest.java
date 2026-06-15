package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;

import java.util.UUID;

@Getter
@Setter
public class SharePostRequest {

    @NotNull
    private UUID userId;

    @Size(max = 1000)
    private String sharedContent;

    private PostPrivacy privacy;
}
