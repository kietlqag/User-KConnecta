package project.kconnecta.user.backend.common.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Set;

/**
 * Nhận dạng định dạng file thật từ magic bytes — không tin tên file / Content-Type client gửi.
 */
public final class MediaFileSniffer {

    private MediaFileSniffer() {
    }

    public static String sniffExtension(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "";
        }
        byte[] header = new byte[32];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.read(header);
        } catch (IOException e) {
            return "";
        }
        return sniffExtension(header, read);
    }

    static String sniffExtension(byte[] header, int read) {
        if (read < 3) {
            return "";
        }
        int b0 = header[0] & 0xFF;
        int b1 = header[1] & 0xFF;
        int b2 = header[2] & 0xFF;
        int b3 = read > 3 ? header[3] & 0xFF : 0;

        // JPEG
        if (b0 == 0xFF && b1 == 0xD8 && b2 == 0xFF) {
            return "jpg";
        }
        // PNG
        if (b0 == 0x89 && b1 == 0x50 && b2 == 0x4E && b3 == 0x47) {
            return "png";
        }
        // GIF
        if (b0 == 0x47 && b1 == 0x49 && b2 == 0x46 && b3 == 0x38) {
            return "gif";
        }
        // WebP / WAV (RIFF) — phân biệt ở offset 8
        if (read >= 12 && b0 == 0x52 && b1 == 0x49 && b2 == 0x46 && b3 == 0x46) {
            if (header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50) {
                return "webp";
            }
            if (read >= 12 && header[8] == 0x57 && header[9] == 0x41 && header[10] == 0x56 && header[11] == 0x45) {
                return "wav";
            }
        }
        // PDF
        if (read >= 4 && b0 == 0x25 && b1 == 0x50 && b2 == 0x44 && b3 == 0x46) {
            return "pdf";
        }
        // Legacy Word (.doc)
        if (read >= 8
                && b0 == 0xD0 && b1 == 0xCF && b2 == 0x11 && b3 == 0xE0
                && header[4] == (byte) 0xA1 && header[5] == (byte) 0xB1
                && header[6] == 0x1A && header[7] == (byte) 0xE1) {
            return "doc";
        }
        // ZIP / DOCX (Office Open XML)
        if (b0 == 0x50 && b1 == 0x4B && (b2 == 0x03 || b2 == 0x05 || b2 == 0x07) && (b3 == 0x04 || b3 == 0x06 || b3 == 0x08)) {
            return "docx";
        }
        // MP4 / MOV (ftyp)
        if (read >= 12 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) {
            return sniffIsoBrand(header, read);
        }
        // WebM / MKV (EBML)
        if (b0 == 0x1A && b1 == 0x45 && b2 == 0xDF && b3 == 0xA3) {
            return "webm";
        }
        // OGG
        if (read >= 4 && b0 == 0x4F && b1 == 0x67 && b2 == 0x67 && b3 == 0x53) {
            return "ogg";
        }
        // MP3 (ID3 or frame sync)
        if ((b0 == 0x49 && b1 == 0x44 && b2 == 0x33)
                || (b0 == 0xFF && (b1 & 0xE0) == 0xE0)) {
            return "mp3";
        }
        return "";
    }

    private static String sniffIsoBrand(byte[] header, int read) {
        if (read < 12) {
            return "mp4";
        }
        String brand = new String(header, 8, Math.min(4, read - 8), java.nio.charset.StandardCharsets.US_ASCII)
                .toLowerCase(Locale.ROOT);
        if (brand.startsWith("qt")) {
            return "mov";
        }
        return "mp4";
    }

    /** Ảnh avatar/cover/chat — chỉ JPEG, PNG, WebP, GIF. */
    public static boolean isAllowedImage(MultipartFile file, Set<String> allowed) {
        String ext = sniffExtension(file);
        if (ext.isBlank()) {
            return false;
        }
        return allowed.contains(ext) || ("jpg".equals(ext) && allowed.contains("jpeg"));
    }

    public static boolean isLikelyPlainText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return false;
        }
        try {
            byte[] sample = file.getInputStream().readNBytes(8192);
            if (sample.length == 0) {
                return false;
            }
            for (byte b : sample) {
                if (b == 0) {
                    return false;
                }
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public static boolean extensionsCompatible(String sniffed, String declared) {
        if (sniffed == null || declared == null || sniffed.isBlank() || declared.isBlank()) {
            return true;
        }
        String s = normalizeExt(sniffed);
        String d = normalizeExt(declared);
        if (s.equals(d)) {
            return true;
        }
        if (isJpegAlias(s) && isJpegAlias(d)) {
            return true;
        }
        if (isMp4Family(s) && isMp4Family(d)) {
            return true;
        }
        if ("webm".equals(s) && "mkv".equals(d)) {
            return true;
        }
        if ("mkv".equals(s) && "webm".equals(d)) {
            return true;
        }
        return false;
    }

    private static boolean isJpegAlias(String ext) {
        return "jpg".equals(ext) || "jpeg".equals(ext);
    }

    private static boolean isMp4Family(String ext) {
        return "mp4".equals(ext) || "mov".equals(ext);
    }

    private static String normalizeExt(String raw) {
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (t.startsWith(".")) {
            t = t.substring(1);
        }
        return t.replaceAll("[^a-z0-9]", "");
    }
}
