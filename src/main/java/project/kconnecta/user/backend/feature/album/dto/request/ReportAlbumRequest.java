package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReportAlbumRequest {

    @NotBlank
    @Size(max = 50)
    private String reason;

    @Size(max = 2000)
    private String detail;
}
