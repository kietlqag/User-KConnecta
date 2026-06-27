package project.kconnecta.user.backend.feature.group.util;

import project.kconnecta.user.backend.feature.group.dto.response.GroupResponse;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupSort;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class GroupSortSupport {

    private static final Collator VI_COLLATOR = Collator.getInstance(new Locale("vi", "VN"));

    static {
        VI_COLLATOR.setStrength(Collator.PRIMARY);
    }

    private GroupSortSupport() {
    }

    public static List<GroupResponse> sort(List<GroupResponse> groups, GroupSort sort) {
        if (groups == null || groups.isEmpty()) {
            return List.of();
        }
        List<GroupResponse> sorted = new ArrayList<>(groups);
        Comparator<GroupResponse> comparator = switch (sort) {
            case NAME_ASC -> Comparator.comparing(GroupResponse::getName, VI_COLLATOR);
            case NAME_DESC -> Comparator.comparing(GroupResponse::getName, VI_COLLATOR).reversed();
            case MEMBERS_DESC -> Comparator.comparingInt(GroupResponse::getMemberCount).reversed();
            case MEMBERS_ASC -> Comparator.comparingInt(GroupResponse::getMemberCount);
            case RECENT -> Comparator.comparing(
                    GroupResponse::getUpdatedAt,
                    Comparator.nullsLast(Comparator.naturalOrder())
            ).reversed();
        };
        sorted.sort(comparator);
        return sorted;
    }
}
