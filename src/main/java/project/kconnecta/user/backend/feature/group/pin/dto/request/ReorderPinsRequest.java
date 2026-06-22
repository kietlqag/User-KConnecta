package project.kconnecta.user.backend.feature.group.pin.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ReorderPinsRequest {
    @NotEmpty
    private List<UUID> orderedPostIds; // index = thứ tự hiển thị mới
}
