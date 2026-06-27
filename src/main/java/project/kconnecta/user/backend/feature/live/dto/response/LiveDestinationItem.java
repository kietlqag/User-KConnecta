package project.kconnecta.user.backend.feature.live.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class LiveDestinationItem {
    private UUID id;
    private String name;
    private String description;
    private String coverPhotoUrl;
}

