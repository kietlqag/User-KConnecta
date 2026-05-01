package project.kconnecta.user.backend.feature.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CallParticipantInfo {
    private UUID userId;
    private String name;
    private String avatar;
}
