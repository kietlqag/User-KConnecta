package project.kconnecta.user.backend.feature.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "call_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "call_id", nullable = false, unique = true)
    private UUID callId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caller_id", nullable = false)
    private User caller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "callee_id", nullable = false)
    private User callee;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "duration_sec")
    private Integer durationSec;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "last_signal_type", length = 32)
    private String lastSignalType;

    @Builder.Default
    @Column(name = "call_media_type", length = 16)
    private String callMediaType = "audio";

    @Builder.Default
    @Column(name = "call_log_sent", nullable = false)
    private Boolean callLogSent = false;
}
