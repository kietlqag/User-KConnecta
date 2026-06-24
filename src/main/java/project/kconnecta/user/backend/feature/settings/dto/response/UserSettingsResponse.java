package project.kconnecta.user.backend.feature.settings.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.settings.entity.SettingsTheme;
import project.kconnecta.user.backend.feature.settings.entity.SettingsVisibility;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class UserSettingsResponse {
    private UUID userId;
    private boolean twoFactorEnabled;
    private SettingsVisibility profileVisibility;
    private SettingsVisibility postsVisibility;
    private boolean notifyPosts;
    private boolean notifyMessages;
    private boolean notifyEmail;
    private SettingsTheme theme;
    private String language;
    private List<BlockedUserResponse> blockedUsers;
    private List<LoginSessionResponse> devices;
}
