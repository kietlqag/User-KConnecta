package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.request.UpsertLiveScheduleRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveScheduleResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSchedule;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.live.repository.LiveScheduleRepository;
import project.kconnecta.user.backend.feature.live.service.LiveScheduleService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LiveScheduleServiceImpl implements LiveScheduleService {

    private final LiveScheduleRepository liveScheduleRepository;
    private final UserRepository userRepository;

    @Override
    public LiveScheduleResponse upsertSchedule(UpsertLiveScheduleRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));

        LocalDateTime now = LocalDateTime.now();
        validateSchedule(request, now);

        LiveSchedule schedule = liveScheduleRepository.findTopByUserIdOrderByUpdatedAtDesc(request.getUserId())
                .orElseGet(() -> LiveSchedule.builder().user(user).build());

        schedule.setStartMode(request.getStartMode());
        schedule.setScheduledAt(request.getStartMode() == LiveStartMode.SCHEDULED ? request.getScheduledAt() : null);

        LiveSchedule saved = liveScheduleRepository.save(schedule);
        return toResponse(saved, now);
    }

    @Override
    @Transactional(readOnly = true)
    public LiveScheduleResponse getSchedule(UUID userId) {
        LocalDateTime now = LocalDateTime.now();
        LiveSchedule schedule = liveScheduleRepository.findTopByUserIdOrderByUpdatedAtDesc(userId)
                .orElse(null);

        if (schedule == null) {
            return LiveScheduleResponse.builder()
                    .id(null)
                    .userId(userId)
                    .startMode(LiveStartMode.NOW)
                    .scheduledAt(null)
                    .effectiveStartAt(now)
                    .updatedAt(null)
                    .build();
        }

        return toResponse(schedule, now);
    }

    private void validateSchedule(UpsertLiveScheduleRequest request, LocalDateTime now) {
        if (request.getStartMode() == LiveStartMode.SCHEDULED) {
            if (request.getScheduledAt() == null) {
                throw new ValidationException("scheduledAt is required when startMode is SCHEDULED");
            }
            if (!request.getScheduledAt().isAfter(now)) {
                throw new ValidationException("Thời gian phát phải ở tương lai");
            }
        }
    }

    private LiveScheduleResponse toResponse(LiveSchedule schedule, LocalDateTime now) {
        LocalDateTime effectiveStartAt = schedule.getStartMode() == LiveStartMode.SCHEDULED
                ? schedule.getScheduledAt()
                : now;

        return LiveScheduleResponse.builder()
                .id(schedule.getId())
                .userId(schedule.getUser().getId())
                .startMode(schedule.getStartMode())
                .scheduledAt(schedule.getScheduledAt())
                .effectiveStartAt(effectiveStartAt)
                .updatedAt(schedule.getUpdatedAt())
                .build();
    }
}

