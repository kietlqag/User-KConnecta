package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.service.LiveKitEgressService;
import io.livekit.server.EgressServiceClient;
import livekit.LivekitEgress;
import retrofit2.Response;

import java.util.Optional;

@Service
@Slf4j
public class LiveKitEgressServiceImpl implements LiveKitEgressService {

    @Value("${livekit.url:}")
    private String livekitUrl;

    @Value("${livekit.api-key:}")
    private String apiKey;

    @Value("${livekit.api-secret:}")
    private String apiSecret;

    @Value("${livekit.egress.enabled:false}")
    private boolean enabled;

    @Value("${livekit.egress.s3-bucket:}")
    private String s3Bucket;

    @Value("${livekit.egress.s3-access-key:}")
    private String s3AccessKey;

    @Value("${livekit.egress.s3-secret:}")
    private String s3Secret;

    @Value("${livekit.egress.s3-region:ap-southeast-1}")
    private String s3Region;

    @Value("${livekit.egress.s3-endpoint:}")
    private String s3Endpoint;

    @Value("${livekit.egress.public-base-url:}")
    private String publicBaseUrl;

    @Override
    public Optional<EgressStartResult> startRoomHlsEgress(LiveSession session) {
        if (!enabled || !isConfigured()) {
            log.debug("LiveKit HLS egress skipped for session {} (not configured)", session.getId());
            return Optional.empty();
        }

        try {
            String apiUrl = toHttpApiUrl(livekitUrl);
            EgressServiceClient client = EgressServiceClient.createClient(apiUrl, apiKey, apiSecret);
            String prefix = "kconnecta/live/" + session.getId();

            LivekitEgress.S3Upload.Builder s3Builder = LivekitEgress.S3Upload.newBuilder()
                    .setBucket(s3Bucket)
                    .setAccessKey(s3AccessKey)
                    .setSecret(s3Secret)
                    .setRegion(s3Region);
            if (!isBlank(s3Endpoint)) {
                s3Builder.setEndpoint(s3Endpoint).setForcePathStyle(true);
            }

            LivekitEgress.SegmentedFileOutput segmentOutput = LivekitEgress.SegmentedFileOutput.newBuilder()
                    .setFilenamePrefix(prefix)
                    .setPlaylistName("playback.m3u8")
                    .setLivePlaylistName("live.m3u8")
                    .setSegmentDuration(2)
                    .setS3(s3Builder.build())
                    .build();

            Response<LivekitEgress.EgressInfo> response = client.startRoomCompositeEgress(
                    session.getRoomName(),
                    segmentOutput,
                    "speaker",
                    LivekitEgress.EncodingOptionsPreset.H264_720P_30,
                    null,
                    false,
                    false,
                    ""
            ).execute();

            if (!response.isSuccessful() || response.body() == null) {
                log.error("LiveKit egress start failed for session {}: HTTP {}", session.getId(), response.code());
                return Optional.empty();
            }

            String hlsUrl = buildPublicHlsUrl(prefix);
            return Optional.of(EgressStartResult.builder()
                    .egressId(response.body().getEgressId())
                    .hlsPlaybackUrl(hlsUrl)
                    .build());
        } catch (Exception ex) {
            log.error("Failed to start LiveKit HLS egress for session {}", session.getId(), ex);
            return Optional.empty();
        }
    }

    @Override
    public void stopEgress(String egressId) {
        if (!enabled || isBlank(egressId) || isBlank(livekitUrl) || isBlank(apiKey) || isBlank(apiSecret)) {
            return;
        }
        try {
            EgressServiceClient client = EgressServiceClient.createClient(toHttpApiUrl(livekitUrl), apiKey, apiSecret);
            client.stopEgress(egressId).execute();
        } catch (Exception ex) {
            log.warn("Failed to stop LiveKit egress {}: {}", egressId, ex.getMessage());
        }
    }

    private boolean isConfigured() {
        return !isBlank(livekitUrl)
                && !isBlank(apiKey)
                && !isBlank(apiSecret)
                && !isBlank(s3Bucket)
                && !isBlank(s3AccessKey)
                && !isBlank(s3Secret)
                && !isBlank(publicBaseUrl);
    }

    private String buildPublicHlsUrl(String prefix) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/" + prefix + "/live.m3u8";
    }

    private String toHttpApiUrl(String url) {
        if (isBlank(url)) return url;
        return url
                .replaceFirst("^wss://", "https://")
                .replaceFirst("^ws://", "http://")
                .replaceAll("/+$", "");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
