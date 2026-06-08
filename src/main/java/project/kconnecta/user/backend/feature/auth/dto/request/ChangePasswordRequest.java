package project.kconnecta.user.backend.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordRequest {
    @NotBlank(message = "Email khong duoc de trong")
    private String email;

    @NotBlank(message = "Mat khau cu khong duoc de trong")
    private String oldPassword;

    @NotBlank(message = "Mat khau moi khong duoc de trong")
    @Size(min = 8, message = "Mat khau moi phai co it nhat 8 ky tu")
    private String newPassword;
}
