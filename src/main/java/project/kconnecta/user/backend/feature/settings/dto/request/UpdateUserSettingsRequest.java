package project.kconnecta.user.backend.feature.settings.dto.request;

import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.settings.entity.SettingsTheme;
import project.kconnecta.user.backend.feature.settings.entity.SettingsVisibility;

@Getter
@Setter
public class UpdateUserSettingsRequest {
    private Boolean twoFactorEnabled;
    private SettingsVisibility profileVisibility;
    private SettingsVisibility postsVisibility;
    private Boolean notifyPosts;
    private Boolean notifyMessages;
    private Boolean notifyEmail;
    private SettingsTheme theme;
    private String language;
}
