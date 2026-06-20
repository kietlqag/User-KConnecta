package project.kconnecta.user.backend.feature.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Reads the recommendation policy at runtime and maps the admin-facing config (4 weight
 * sliders + toggles) onto the 3 signals the home-feed scoring query actually uses:
 * affinity / engagement / recency.
 *
 * <p>Mapping (Hướng A rút gọn):
 * <ul>
 *   <li>affinity   ← weights.friends, gated by toggle {@code prioritizeFriends}</li>
 *   <li>engagement ← weights.engagement + weights.trending, gated by toggle {@code prioritizeHot}</li>
 *   <li>recency    ← weights.newContent (always on — base freshness)</li>
 * </ul>
 * Toggles {@code prioritizeTopics} and {@code reduceToxicContent} are NOT applied yet:
 * the feed query has no topic-affinity or per-post toxic score to act on. They remain on
 * the admin UI as stored preferences for a future phase.
 */
@Component
@RequiredArgsConstructor
public class RecommendationPolicyReader {

    /** Fallback weights = the historical hardcoded values, used when config is empty/all-zero. */
    private static final double DEFAULT_AFFINITY = 0.20;
    private static final double DEFAULT_ENGAGEMENT = 0.40;
    private static final double DEFAULT_RECENCY = 0.40;

    private final PolicyService policyService;

    /** Normalized feed weights (sum ≈ 1.0) for {@code findHomeFeedPostsWithScoring}. */
    public record FeedWeights(double affinity, double engagement, double recency) {}

    public FeedWeights getFeedWeights() {
        JsonNode rec = policyService.getConfigJson().path("recommendation");
        JsonNode weights = rec.path("weights");

        // Defaults match resources/policy/default-config.json
        double friends = weights.path("friends").asDouble(30);
        double engagement = weights.path("engagement").asDouble(40);
        double trending = weights.path("trending").asDouble(20);
        double newContent = weights.path("newContent").asDouble(10);

        boolean prioritizeFriends = rec.path("prioritizeFriends").asBoolean(true);
        boolean prioritizeHot = rec.path("prioritizeHot").asBoolean(true);

        double a = prioritizeFriends ? friends : 0;
        double e = prioritizeHot ? (engagement + trending) : 0;
        double r = newContent;
        double total = a + e + r;

        if (total <= 0) {
            return new FeedWeights(DEFAULT_AFFINITY, DEFAULT_ENGAGEMENT, DEFAULT_RECENCY);
        }
        return new FeedWeights(a / total, e / total, r / total);
    }
}
