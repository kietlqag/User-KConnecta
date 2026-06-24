package project.kconnecta.user.backend.feature.birthday.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class BirthdayFriendResponse {
    private UUID friendshipId;
    private UUID userId;
    private String fullName;
    private String avatarUrl;
    private LocalDate dateOfBirth;
    private int age;
    private boolean today;
    private int daysUntil;
}
