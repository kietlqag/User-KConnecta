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

    /** True when egress is enabled and all required R2/S3 env vars are set. */
    boolean isEgressConfigured();

    /** HLS live playlist (growing window while broadcasting). */
    String buildLivePlaylistUrl(java.util.UUID sessionId);

    /** HLS VOD playlist (full recording after live ends). */
    String buildVodPlaylistUrl(java.util.UUID sessionId);
}
