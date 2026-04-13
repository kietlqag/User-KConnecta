package project.kconnecta.user.backend.feature.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "call_signal_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallSignalEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "call_session_id", nullable = false)
    private CallSession callSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @Column(name = "signal_type", nullable = false, length = 32)
    private String signalType;

    @Column(name = "sdp", columnDefinition = "TEXT")
    private String sdp;

    @Column(name = "candidate", columnDefinition = "TEXT")
    private String candidate;

    @Column(name = "sdp_mid", length = 255)
    private String sdpMid;

    @Column(name = "sdp_mline_index")
    private Integer sdpMLineIndex;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

