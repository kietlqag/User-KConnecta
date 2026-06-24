package project.kconnecta.user.backend.feature.birthday.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class SendBirthdayWishRequest {

    @NotNull
    private UUID recipientId;

    @NotBlank
    @Size(min = 1, max = 500)
    private String message;
}
