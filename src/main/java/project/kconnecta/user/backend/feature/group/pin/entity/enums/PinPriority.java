package project.kconnecta.user.backend.feature.group.pin.entity.enums;

/** Mức ưu tiên hiển thị. rank nhỏ hơn = ưu tiên cao hơn (sắp trước). */
public enum PinPriority {
    CRITICAL(0), HIGH(1), NORMAL(2), LOW(3);

    private final int rank;

    PinPriority(int rank) {
        this.rank = rank;
    }

    public int getRank() {
        return rank;
    }
}
