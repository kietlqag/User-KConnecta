package project.kconnecta.user.backend.feature.friend.service.support;

import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Component
public class FriendSuggestionScorer {

    private static final double W_MUTUAL = 0.45;
    private static final double W_SCHOOL = 0.20;
    private static final double W_LOCATION = 0.15;
    private static final double W_INTEREST = 0.20;

    public RankedCandidate rank(
            User currentUser,
            User candidate,
            int mutualFriends,
            Set<String> myTopics,
            Set<String> candidateTopics) {
        double mutualScore = Math.min(mutualFriends / 5.0, 1.0);
        double schoolScore = hasSameSchool(currentUser, candidate) ? 1.0 : 0.0;
        double locationScore = locationAffinity(currentUser, candidate);
        double interestScore = interestAffinity(myTopics, candidateTopics);
        int sharedInterests = countSharedTopics(myTopics, candidateTopics);

        double score = W_MUTUAL * mutualScore
                + W_SCHOOL * schoolScore
                + W_LOCATION * locationScore
                + W_INTEREST * interestScore;

        return new RankedCandidate(
                candidate.getId(),
                score,
                mutualFriends,
                buildReason(mutualFriends, schoolScore > 0, locationScore > 0, sharedInterests));
    }

    private double locationAffinity(User currentUser, User candidate) {
        String myHometown = normalize(currentUser.getHometown());
        String myLocation = normalize(currentUser.getLocation());
        String candidateHometown = normalize(candidate.getHometown());
        String candidateLocation = normalize(candidate.getLocation());

        if (myHometown != null && myHometown.equals(candidateHometown)) {
            return 1.0;
        }
        if (myLocation != null && myLocation.equals(candidateLocation)) {
            return 0.85;
        }
        if (myHometown != null && myHometown.equals(candidateLocation)) {
            return 0.7;
        }
        if (myLocation != null && myLocation.equals(candidateHometown)) {
            return 0.7;
        }
        return 0.0;
    }

    private boolean hasSameSchool(User currentUser, User candidate) {
        String mySchool = normalize(currentUser.getSchool());
        String candidateSchool = normalize(candidate.getSchool());
        return mySchool != null && mySchool.equals(candidateSchool);
    }

    private double interestAffinity(Set<String> myTopics, Set<String> candidateTopics) {
        if (myTopics.isEmpty() || candidateTopics.isEmpty()) {
            return 0.0;
        }
        return Math.min(countSharedTopics(myTopics, candidateTopics) / 3.0, 1.0);
    }

    private int countSharedTopics(Set<String> myTopics, Set<String> candidateTopics) {
        if (myTopics.isEmpty() || candidateTopics.isEmpty()) {
            return 0;
        }
        int shared = 0;
        for (String topic : myTopics) {
            if (candidateTopics.contains(topic)) {
                shared++;
            }
        }
        return shared;
    }

    private String buildReason(int mutualFriends, boolean sameSchool, boolean sameArea, int sharedInterests) {
        if (mutualFriends > 0) {
            return mutualFriends + " bạn chung";
        }
        if (sameSchool) {
            return "Cùng trường";
        }
        if (sharedInterests >= 2) {
            return "Cùng sở thích";
        }
        if (sameArea) {
            return "Cùng khu vực";
        }
        if (sharedInterests == 1) {
            return "Cùng sở thích";
        }
        return "Gợi ý cho bạn";
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    public record RankedCandidate(UUID userId, double score, int mutualFriends, String reason) {}
}
