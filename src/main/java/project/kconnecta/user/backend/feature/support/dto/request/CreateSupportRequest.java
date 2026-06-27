package project.kconnecta.user.backend.feature.support.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSupportRequest {

    /** BUG | FEEDBACK | ACCOUNT | OTHER */
    @NotBlank(message = "Vui lòng chọn loại yêu cầu")
    @Size(max = 30)
    private String category;

    @NotBlank(message = "Vui lòng nhập tiêu đề")
    @Size(max = 150, message = "Tiêu đề tối đa 150 ký tự")
    private String subject;

    @NotBlank(message = "Vui lòng nhập nội dung")
    @Size(max = 5000, message = "Nội dung tối đa 5000 ký tự")
    private String message;
}
