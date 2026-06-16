package project.kconnecta.user.backend.feature.live.service;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;

import java.util.Optional;

public interface LiveKitEgressService {

    @Getter
    @Builder
    class EgressStartResult {
        private final String egressId;
        private final String hlsPlaybackUrl;
    }

    Optional<EgressStartResult> startRoomHlsEgress(LiveSession session);

    void stopEgress(String egressId);
}
