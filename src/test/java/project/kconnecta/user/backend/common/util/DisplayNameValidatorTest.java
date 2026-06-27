package project.kconnecta.user.backend.common.util;

import org.junit.jupiter.api.Test;
import project.kconnecta.user.backend.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DisplayNameValidatorTest {

    @Test
    void requireSafe_acceptsNormalName() {
        assertThat(DisplayNameValidator.requireSafe("Nguyễn Văn A")).isEqualTo("Nguyễn Văn A");
    }

    @Test
    void requireSafe_rejectsHtmlTag() {
        assertThatThrownBy(() -> DisplayNameValidator.requireSafe("<img src=x onerror=alert(1)>"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("HTML");
    }

    @Test
    void requireSafe_trimsWhitespace() {
        assertThat(DisplayNameValidator.requireSafe("  Khang  ")).isEqualTo("Khang");
    }
}
