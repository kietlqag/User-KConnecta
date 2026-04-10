package project.kconnecta.user.backend.feature.chat.dto.request;


import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PrivateMessageRequest {
    private UUID receiverId;
    private String content;
}