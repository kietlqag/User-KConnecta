package project.kconnecta.user.backend.feature.interest.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import project.kconnecta.user.backend.feature.interest.entity.enums.InterestEventType;

import java.util.UUID;

@Data
public class RecordInterestEventRequest {

    @NotNull
    private UUID postId;

    @NotNull
    private InterestEventType eventType;
}
