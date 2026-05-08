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
public class SearchGroupDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String type; // "group"
    private String name;
    private String coverImage;
    private String privacy; // "public" | "private"
    private int memberCount;
    // Boolean (boxed) → Lombok generates getIsMember() → Jackson serializes as "isMember"
    private Boolean isMember;
}
