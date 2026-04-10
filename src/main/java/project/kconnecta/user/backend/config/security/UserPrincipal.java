package project.kconnecta.user.backend.config.security;

import java.security.Principal;
import java.util.UUID;

public class UserPrincipal implements Principal {

    private final UUID userId;
    private final String username;

    public UserPrincipal(UUID userId, String username) {
        this.userId = userId;
        this.username = username;
    }

    /**
     * Returns username — used by Spring as the routing key for
     * convertAndSendToUser() and subscription /user/queue/...
     */
    @Override
    public String getName() {
        return username;
    }

    public UUID getUserId() {
        return userId;
    }
}
