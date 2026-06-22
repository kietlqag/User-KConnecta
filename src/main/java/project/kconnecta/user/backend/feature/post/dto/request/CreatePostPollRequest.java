package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreatePostPollRequest {

    @Size(min = 2, max = 10, message = "Poll must have between 2 and 10 options")
    private List<@NotBlank @Size(max = 500) String> options;

    private Boolean allowMultiple;

    private Boolean allowAddOptions;
}
