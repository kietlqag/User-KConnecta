package project.kconnecta.user.backend.feature.friend.service.support;

import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Bộ sinh điểm gợi ý kết bạn (Friend Suggestion Scorer) dựa trên thuật toán chấm điểm đa tiêu chí.
 * Sử dụng mô hình trọng số để tính toán độ tương đồng giữa người dùng hiện tại và các ứng viên gợi ý.
 */
@Component
public class FriendSuggestionScorer {

    // Định nghĩa các Trọng số (Weights) của mô hình gợi ý kết bạn
    private static final double W_MUTUAL = 0.45;   // Trọng số bạn chung (45%)
    private static final double W_SCHOOL = 0.20;   // Trọng số cùng trường học (20%)
    private static final double W_LOCATION = 0.15; // Trọng số cùng quê quán / nơi ở hiện tại (15%)
    private static final double W_INTEREST = 0.20; // Trọng số trùng khớp sở thích (20%)

    /**
     * Chấm điểm tương hợp giữa người dùng hiện tại và một người dùng ứng viên.
     * 
     * @param currentUser Người dùng hiện tại
     * @param candidate Ứng viên được đánh giá gợi ý
     * @param mutualFriends Số lượng bạn chung giữa hai người
     * @param myTopics Tập hợp các chủ đề sở thích của người dùng hiện tại
     * @param candidateTopics Tập hợp các chủ đề sở thích của ứng viên
     * @return Kết quả chấm điểm xếp hạng gồm Điểm số và Lý do gợi ý trực quan
     */
    public RankedCandidate rank(
            User currentUser,
            User candidate,
            int mutualFriends,
            Set<String> myTopics,
            Set<String> candidateTopics) {
        
        // 1. Tính điểm Bạn chung: Tỷ lệ thuận với số lượng bạn chung, đạt tối đa (1.0) khi có từ 5 bạn chung trở lên
        double mutualScore = Math.min(mutualFriends / 5.0, 1.0);
        
        // 2. Tính điểm Trường học: Khớp trường học chính xác (1.0) hoặc không khớp (0.0)
        double schoolScore = hasSameSchool(currentUser, candidate) ? 1.0 : 0.0;
        
        // 3. Tính điểm Khu vực địa lý (quê quán, nơi ở hiện tại)
        double locationScore = locationAffinity(currentUser, candidate);
        
        // 4. Tính điểm Sở thích: Tỷ lệ thuận với số chủ đề trùng khớp, đạt tối đa khi có 3 chủ đề chung trở lên
        double interestScore = interestAffinity(myTopics, candidateTopics);
        int sharedInterests = countSharedTopics(myTopics, candidateTopics);

        // 5. Cộng gộp theo công thức Trọng số để ra điểm số tổng hợp cuối cùng
        double score = W_MUTUAL * mutualScore
                + W_SCHOOL * schoolScore
                + W_LOCATION * locationScore
                + W_INTEREST * interestScore;

        // Trả về đối tượng xếp hạng kèm theo nhãn lý do gợi ý trực quan trên giao diện
        return new RankedCandidate(
                candidate.getId(),
                score,
                mutualFriends,
                buildReason(mutualFriends, schoolScore > 0, locationScore > 0, sharedInterests));
    }

    /**
     * Tính toán mức độ tương hợp về Vị trí địa lý (Hometown & Location).
     * Mức độ ưu tiên giảm dần:
     * - Cùng quê quán: 1.0 điểm
     * - Cùng thành phố sống hiện tại: 0.85 điểm
     * - Quê người này là thành phố sống của người kia: 0.7 điểm
     */
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

    /**
     * Kiểm tra hai người có học cùng một trường hay không.
     */
    private boolean hasSameSchool(User currentUser, User candidate) {
        String mySchool = normalize(currentUser.getSchool());
        String candidateSchool = normalize(candidate.getSchool());
        return mySchool != null && mySchool.equals(candidateSchool);
    }

    /**
     * Tính điểm độ tương hợp sở thích dựa trên số chủ đề trùng khớp.
     */
    private double interestAffinity(Set<String> myTopics, Set<String> candidateTopics) {
        if (myTopics.isEmpty() || candidateTopics.isEmpty()) {
            return 0.0;
        }
        return Math.min(countSharedTopics(myTopics, candidateTopics) / 3.0, 1.0);
    }

    /**
     * Đếm số lượng chủ đề sở thích trùng nhau giữa 2 tập hợp.
     */
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

    /**
     * Xây dựng lý do gợi ý thân thiện với người dùng dựa trên kết quả phân tích tương hợp.
     * Thứ tự ưu tiên hiển thị lý do: Bạn chung -> Cùng trường học -> Trùng từ 2 sở thích -> Cùng khu vực.
     */
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
