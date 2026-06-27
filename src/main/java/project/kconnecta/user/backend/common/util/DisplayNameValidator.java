package project.kconnecta.user.backend.common.util;

import project.kconnecta.user.backend.exception.ValidationException;

import java.util.regex.Pattern;

/** Validates user-visible display names (fullName) — blocks HTML/script injection. */
public final class DisplayNameValidator {

    private static final int MAX_LENGTH = 120;
    private static final Pattern UNSAFE =
            Pattern.compile("[<>]|(?i)javascript:|(?i)on\\w+\\s*=");

    private DisplayNameValidator() {
    }

    public static String requireSafe(String fullName) {
        if (fullName == null) {
            return null;
        }
        String trimmed = fullName.trim();
        if (trimmed.isEmpty()) {
            throw new ValidationException("Họ và tên không được để trống");
        }
        if (trimmed.length() > MAX_LENGTH) {
            throw new ValidationException("Họ và tên tối đa " + MAX_LENGTH + " ký tự");
        }
        if (UNSAFE.matcher(trimmed).find()) {
            throw new ValidationException("Họ và tên không được chứa ký tự HTML hoặc mã script");
        }
        return trimmed;
    }
}
