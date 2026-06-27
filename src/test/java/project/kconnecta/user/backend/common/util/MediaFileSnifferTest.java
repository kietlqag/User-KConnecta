package project.kconnecta.user.backend.common.util;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;

class MediaFileSnifferTest {

    @Test
    void sniffExtension_detectsPngEvenWhenNamedJpg() {
        byte[] pngHeader = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0, 0, 0, 0, 0, 0, 0, 0
        };
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", pngHeader);
        assertThat(MediaFileSniffer.sniffExtension(file)).isEqualTo("png");
    }

    @Test
    void sniffExtension_detectsPdfRenamedAsPng() {
        byte[] pdfHeader = new byte[]{'%', 'P', 'D', 'F', '-', '1', '.', '4'};
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", pdfHeader);
        assertThat(MediaFileSniffer.sniffExtension(file)).isEqualTo("pdf");
    }

    @Test
    void extensionsCompatible_allowsJpegAliases() {
        assertThat(MediaFileSniffer.extensionsCompatible("jpg", "jpeg")).isTrue();
    }
}
