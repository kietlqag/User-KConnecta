package project.kconnecta.user.backend.feature.search.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchPersonDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String type; // "person"
    private String name;
    private String avatar;
    private String bio;
    private int mutualFriends;
    // Boolean (boxed) → Lombok generates getIsFollowing() → Jackson serializes as "isFollowing"
    private Boolean isFollowing;
}
