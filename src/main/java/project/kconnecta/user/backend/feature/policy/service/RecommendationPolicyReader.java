package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Reads recommendation weights for the rule-based rankers used by home feed and Watch/Reel.
 *
 * <p>The old admin sliders have been removed, so the reader now uses stable product defaults unless
 * explicit {@code feedWeights}/{@code reelWeights} are present in policy JSON. Legacy
 * {@code recommendation.weights} is intentionally ignored to avoid keeping the previous
 * engagement-heavy tuning.
 */
@Component
@RequiredArgsConstructor
public class RecommendationPolicyReader {

    private static final RawWeights DEFAULT_FEED =
            new RawWeights(25, 30, 25, 20);
    private static final RawWeights DEFAULT_REEL =
            new RawWeights(15, 25, 35, 25);

    private final PolicyService policyService;

    /** Normalized weights (sum ≈ 1.0) for post/reel scoring queries. */
    public record FeedWeights(double affinity, double engagement, double recency, double topic) {}

    public FeedWeights getFeedWeights() {
        JsonNode rec = policyService.getConfigJson().path("recommendation");
        return readWeights(rec, "feedWeights", DEFAULT_FEED);
    }

    public FeedWeights getReelWeights() {
        JsonNode rec = policyService.getConfigJson().path("recommendation");
        return readWeights(rec, "reelWeights", DEFAULT_REEL);
    }

    private FeedWeights readWeights(JsonNode rec, String nodeName, RawWeights fallback) {
        JsonNode weights = rec.path(nodeName);

        double a = rec.path("prioritizeFriends").asBoolean(true)
                ? weights.path("friends").asDouble(fallback.affinity)
                : 0;
        double e = rec.path("prioritizeHot").asBoolean(true)
                ? weights.path("engagement").asDouble(fallback.engagement)
                : 0;
        double r = weights.path("newContent").asDouble(fallback.recency);
        double t = rec.path("prioritizeTopics").asBoolean(true)
                ? weights.path("topics").asDouble(fallback.topic)
                : 0;
        double total = a + e + r + t;

        if (total <= 0) {
            return normalize(fallback.affinity, fallback.engagement, fallback.recency, fallback.topic);
        }
        return normalize(a, e, r, t);
    }

    private FeedWeights normalize(double affinity, double engagement, double recency, double topic) {
        double total = affinity + engagement + recency + topic;
        if (total <= 0) {
            return new FeedWeights(0.25, 0.30, 0.25, 0.20);
        }
        return new FeedWeights(affinity / total, engagement / total, recency / total, topic / total);
    }

    private record RawWeights(double affinity, double engagement, double recency, double topic) {}
}
