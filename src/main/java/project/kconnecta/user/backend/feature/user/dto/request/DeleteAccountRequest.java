package project.kconnecta.user.backend.feature.user.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeleteAccountRequest {
    /** Required when the account has a password; omitted for Google-only accounts. */
    private String password;
}
