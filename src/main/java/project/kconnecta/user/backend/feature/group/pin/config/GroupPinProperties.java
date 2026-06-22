package project.kconnecta.user.backend.feature.group.pin.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "group.pin")
@Getter
@Setter
public class GroupPinProperties {
    /** Số bài ghim ACTIVE tối đa mỗi Group. */
    private int max = 5;
    /** Bật auto-unpin theo expires_at. */
    private boolean autoUnpin = true;
    /** Bật notification khi có bài ghim mới. */
    private boolean notifications = true;
    /** Bật đánh dấu đã đọc / unread-count. */
    private boolean readTracking = true;
}
