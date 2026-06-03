package project.kconnecta.user.backend.feature.activity.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.feature.activity.entity.UserActivityLog;
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;
import project.kconnecta.user.backend.feature.activity.repository.UserActivityLogRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final UserActivityLogRepository repository;

    @Async
    public void log(UUID userId, String username, ActivityLogType actionType, String metadata) {
        repository.save(UserActivityLog.builder()
                .userId(userId)
                .username(username)
                .actionType(actionType)
                .metadata(metadata)
                .build());
    }

    @Async
    public void log(UUID userId, String username, ActivityLogType actionType) {
        log(userId, username, actionType, null);
    }

    /** Synchronous write for admin-critical events (e.g. account review requests). */
    public void logSync(UUID userId, String username, ActivityLogType actionType, String metadata) {
        repository.save(UserActivityLog.builder()
                .userId(userId)
                .username(username)
                .actionType(actionType)
                .metadata(metadata)
                .build());
    }
}
