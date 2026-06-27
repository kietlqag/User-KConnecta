package project.kconnecta.user.backend.feature.group.entity.enums;

public enum GroupSort {
    RECENT,
    NAME_ASC,
    NAME_DESC,
    MEMBERS_DESC,
    MEMBERS_ASC;

    public static GroupSort fromParam(String value) {
        if (value == null || value.isBlank()) {
            return RECENT;
        }
        return switch (value.trim().toLowerCase()) {
            case "name-asc" -> NAME_ASC;
            case "name-desc" -> NAME_DESC;
            case "members-desc" -> MEMBERS_DESC;
            case "members-asc" -> MEMBERS_ASC;
            default -> RECENT;
        };
    }
}
