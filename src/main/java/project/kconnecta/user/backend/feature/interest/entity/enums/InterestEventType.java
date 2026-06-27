package project.kconnecta.user.backend.feature.interest.entity.enums;

public enum InterestEventType {
    VIEW,
    REACTION,
    COMMENT,
    SHARE,
    SAVE;

    public double weight() {
        return switch (this) {
            case VIEW -> 1.0;
            case REACTION -> 3.0;
            case COMMENT -> 5.0;
            case SHARE -> 4.0;
            case SAVE -> 3.0;
        };
    }
}
