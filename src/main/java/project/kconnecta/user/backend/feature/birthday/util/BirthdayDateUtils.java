package project.kconnecta.user.backend.feature.birthday.util;

import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;

public final class BirthdayDateUtils {

    private BirthdayDateUtils() {
    }

    public static int calculateAge(LocalDate dateOfBirth) {
        if (dateOfBirth == null) {
            return 0;
        }
        return Period.between(dateOfBirth, LocalDate.now()).getYears();
    }

    public static boolean isBirthdayToday(LocalDate dateOfBirth) {
        if (dateOfBirth == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        return dateOfBirth.getMonth() == today.getMonth()
                && dateOfBirth.getDayOfMonth() == today.getDayOfMonth();
    }

    public static int daysUntilNextBirthday(LocalDate dateOfBirth) {
        if (dateOfBirth == null) {
            return Integer.MAX_VALUE;
        }
        LocalDate today = LocalDate.now();
        LocalDate next = dateOfBirth.withYear(today.getYear());
        if (!next.isAfter(today)) {
            next = next.plusYears(1);
        }
        return (int) ChronoUnit.DAYS.between(today, next);
    }

    public static boolean isWithinUpcomingDays(LocalDate dateOfBirth, int days) {
        if (dateOfBirth == null || days < 0) {
            return false;
        }
        if (isBirthdayToday(dateOfBirth)) {
            return true;
        }
        return daysUntilNextBirthday(dateOfBirth) <= days;
    }
}
