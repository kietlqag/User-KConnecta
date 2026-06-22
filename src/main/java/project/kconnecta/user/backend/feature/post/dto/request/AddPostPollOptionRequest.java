package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddPostPollOptionRequest {

    @NotBlank
    @Size(max = 500)
    private String text;
}
