package project.kconnecta.user.backend.feature.birthday.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BirthdayMonthGroupResponse {
    private int month;
    private String monthLabel;
    private List<BirthdayFriendResponse> friends;
}
