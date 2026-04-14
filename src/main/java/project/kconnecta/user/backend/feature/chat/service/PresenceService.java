package project.kconnecta.user.backend.feature.chat.service;

public interface PresenceService {
    void handleSessionConnected(String sessionId, String username);
    void handleSessionDisconnected(String sessionId);
    void sendInitialPresenceSnapshot(String username);
}

