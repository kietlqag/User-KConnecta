package project.kconnecta.user.backend.feature.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bộ ĐÁNH GIÁ ĐỘ BỀN NGÔN NGỮ cho bộ phân loại kiểm duyệt AI tier-2 — trả lời câu phản biện
 * <i>"Gemini kiểm duyệt tiếng Việt (teencode, bỏ dấu, làm mờ ký tự) có tốt như tiếng Anh
 * không, và đã kiểm chứng chưa?"</i>
 *
 * <p><b>Ý tưởng:</b> lấy CÙNG một vi phạm, diễn đạt qua nhiều "kiểu" ({@code style}):
 * tiếng Việt chuẩn, teencode, bỏ dấu, làm mờ ký tự, tiếng Anh. Tất cả đều là VI PHẠM nên AI
 * lý tưởng phải bắt 100% ở mọi kiểu. Đo <b>recall theo từng kiểu</b> → recall tụt ở
 * teencode/bỏ dấu/làm mờ so với tiếng Việt chuẩn / tiếng Anh = BẰNG CHỨNG ĐỊNH LƯỢNG của
 * điểm mù ngôn ngữ (đúng thứ Q87 yêu cầu chứng minh).
 *
 * <h3>HAI KHÁI NIỆM CỐT LÕI (đọc trước khi xem báo cáo)</h3>
 * <ul>
 *   <li><b>Recall theo kiểu</b> = (số bài AI BẮT được) / (số bài đã chấm) <i>riêng cho mỗi kiểu viết</i>.
 *       Vì MỌI bài trong tập này đều là vi phạm nên không có khái niệm precision ở đây —
 *       AI lý tưởng phải bắt 100% (recall = 1.000) ở mọi kiểu. Recall của 1 kiểu mà thấp
 *       nghĩa là AI hay BỎ LỌT vi phạm khi nó được viết theo kiểu đó.</li>
 *   <li><b>Bias gap</b> (độ lệch thiên vị) = recall(kiểu cao nhất) − recall(kiểu thấp nhất).
 *       Ví dụ english=1.000 còn obfuscated=0.750 → bias gap = 0.250. Gap CÀNG LỚN =
 *       điểm mù ngôn ngữ CÀNG RÕ (AI giỏi tiếng Anh/Việt chuẩn nhưng yếu với teencode/bỏ
 *       dấu/làm mờ chữ). Gap = 0 nghĩa là AI đối xử đồng đều mọi kiểu (trên tập này).</li>
 * </ul>
 * <pre>
 *   Ví dụ một bảng kết quả:
 *     Kiểu            N   Bắt  Bỏ lọt  Recall
 *     english         8    8     0     1.000   ← cao nhất
 *     plain_vi        8    8     0     1.000
 *     teencode        8    7     1     0.875
 *     obfuscated      8    6     2     0.750   ← thấp nhất
 *   → bias gap = 1.000 − 0.750 = 0.250  (đây là số liệu trả lời trực tiếp Q87)
 * </pre>
 *
 * <p>Giới hạn, cấu hình env (quota / throttle / retry) và cách đọc: xem README cùng thư mục
 * và {@link GeminiModerationEvalTest}. Báo cáo UTF-8 ghi ra
 * {@code target/moderation-eval-robustness.txt}; console chỉ in tóm tắt ASCII.
 *
 * <p><b>Chạy nhanh (PowerShell):</b>
 * <pre>
 *   $env:GEMINI_API_KEY="khoa-cua-ban"
 *   $env:GEMINI_MODELS="gemini-3.1-flash-lite"
 *   ./mvnw "-Dtest=GeminiModerationRobustnessEvalTest" test
 * </pre>
 */
@EnabledIfEnvironmentVariable(named = "GEMINI_API_KEY", matches = ".+")
class GeminiModerationRobustnessEvalTest {

    private record Row(String concept, String style, String text) {}

    private static final class StyleStat {
        int total;
        int caught;     // AI dự đoán unsafe (bắt được vi phạm)
        int missed;     // AI dự đoán safe   (bỏ lọt)
        int aiFailed;   // Optional.empty (hết quota/lỗi)
        final List<Row> slipped = new ArrayList<>();
    }

    @Test
    void evaluateLanguageRobustness() throws Exception {
        String apiKey = System.getenv("GEMINI_API_KEY");
        String models = Optional.ofNullable(System.getenv("GEMINI_MODELS")).orElse("");
        long delayMs = parseLong(System.getenv("EVAL_DELAY_MS"), 7000L);
        int maxRetries = (int) parseLong(System.getenv("EVAL_MAX_RETRIES"), 0L);
        long cooldownMs = parseLong(System.getenv("EVAL_RETRY_COOLDOWN_MS"), 65000L);
        int maxConsecFails = (int) parseLong(System.getenv("EVAL_MAX_CONSECUTIVE_FAILS"), 5L);

        GeminiModerationService service = new GeminiModerationService(new ObjectMapper(), apiKey, models);
        List<Row> dataset = loadDataset("/moderation-eval/dataset-robustness.csv");

        Map<String, StyleStat> byStyle = new LinkedHashMap<>();
        for (Row row : dataset) {
            byStyle.computeIfAbsent(row.style(), k -> new StyleStat()).total++;
        }

        // Vòng chính + (tùy chọn) retry. CÓ "CẦU DAO": AI_FAILED nhiều lần LIÊN TIẾP thì dừng
        // ngay — dấu hiệu cạn quota (nhất là quota THEO NGÀY/RPD, retry không cứu được).
        boolean aborted = false;
        String abortNote = null;
        List<Row> pending = new ArrayList<>(dataset);
        for (int round = 0; round <= maxRetries && !pending.isEmpty() && !aborted; round++) {
            if (round > 0) {
                System.out.printf("[robustness] retry round %d/%d for %d failed, cooldown %ds...%n",
                        round, maxRetries, pending.size(), cooldownMs / 1000);
                Thread.sleep(cooldownMs);
            }
            List<Row> stillFailed = new ArrayList<>();
            int consecFails = 0;
            for (int i = 0; i < pending.size(); i++) {
                Row row = pending.get(i);
                StyleStat st = byStyle.get(row.style());
                Optional<GeminiModerationService.ModerationResult> result = service.moderate(row.text());
                if (result.isEmpty()) {
                    stillFailed.add(row);
                    if (++consecFails >= maxConsecFails) {
                        stillFailed.addAll(pending.subList(i + 1, pending.size()));
                        aborted = true;
                        abortNote = consecFails + " lần AI_FAILED LIÊN TIẾP — nhiều khả năng CẠN QUOTA "
                                + "(đặc biệt quota theo NGÀY); dừng sớm.";
                        break;
                    }
                } else if (!result.get().safe()) {
                    consecFails = 0;
                    st.caught++;                 // AI nói "vi phạm" → BẮT ĐÚNG (mọi bài ở đây đều là vi phạm)
                } else {
                    consecFails = 0;
                    st.missed++;                 // AI nói "sạch" cho một bài vi phạm → BỎ LỌT
                    st.slipped.add(row);         // lưu lại để in danh sách "vi phạm bị bỏ lọt theo kiểu"
                }
                if (delayMs > 0) {
                    Thread.sleep(delayMs);
                }
            }
            pending = stillFailed;
        }
        for (Row row : pending) { // các mẫu không bao giờ có verdict
            byStyle.get(row.style()).aiFailed++;
        }

        StringBuilder r = new StringBuilder();
        r.append("============================================================\n");
        r.append(" ĐỘ BỀN NGÔN NGỮ CỦA KIỂM DUYỆT AI (recall theo kiểu biến tấu)\n");
        r.append("============================================================\n");
        r.append(String.format("Model cấu hình : %s%n", models.isBlank() ? "(mặc định — dò fallback; xem log INFO)" : models));
        r.append(String.format("Tổng mẫu       : %d (tất cả đều là VI PHẠM — lý tưởng recall = 1.000)%n", dataset.size()));
        r.append("------------------------------------------------------------\n");
        r.append(String.format("%-16s %4s %7s %8s %9s%n", "Kiểu", "N", "Bắt", "Bỏ lọt", "Recall"));
        r.append("------------------------------------------------------------\n");

        double bestRecall = -1, worstRecall = 2;
        String bestStyle = "-", worstStyle = "-";
        int totalAiFailed = 0;
        for (Map.Entry<String, StyleStat> e : byStyle.entrySet()) {
            StyleStat st = e.getValue();
            totalAiFailed += st.aiFailed;
            int scored = st.caught + st.missed;                            // số bài thực sự chấm được cho kiểu này
            double recall = scored == 0 ? 0 : (double) st.caught / scored; // recall của kiểu = bắt được / đã chấm
            r.append(String.format("%-16s %4d %7d %8d %9.3f%s%n",
                    e.getKey(), st.total, st.caught, st.missed, recall,
                    st.aiFailed > 0 ? "  (AI_FAILED=" + st.aiFailed + ")" : ""));
            if (scored > 0 && recall > bestRecall) { bestRecall = recall; bestStyle = e.getKey(); }
            if (scored > 0 && recall < worstRecall) { worstRecall = recall; worstStyle = e.getKey(); }
        }
        r.append("------------------------------------------------------------\n");
        if (bestRecall >= 0 && worstRecall <= 1) {
            r.append(String.format("Chênh lệch (bias gap): kiểu tốt nhất '%s' (%.3f) - tệ nhất '%s' (%.3f) = %.3f%n",
                    bestStyle, bestRecall, worstStyle, worstRecall, bestRecall - worstRecall));
            r.append("  → chênh lệch càng lớn = điểm mù ngôn ngữ càng rõ (thường english/plain_vi cao,\n");
            r.append("    obfuscated/no_diacritics thấp). Đây là số liệu trả lời trực tiếp Q87.\n");
        }
        r.append("------------------------------------------------------------\n");
        r.append("LƯU Ý: cỡ mẫu nhỏ — coi đây là TÍN HIỆU xu hướng, không phải số tuyệt đối.\n");
        r.append("Mở rộng mỗi kiểu (đặc biệt thêm kiểu 'noi_lai' do người curate) để củng cố.\n");
        if (aborted) {
            r.append("!!! DỪNG SỚM: ").append(abortNote).append("\n");
            r.append("   → Quota có thể theo NGÀY (RPD) — bucket riêng theo model. Đổi GEMINI_MODELS / xem README.\n");
        } else if (totalAiFailed > 0) {
            r.append(String.format("CÒN %d mẫu AI_FAILED. Xem mục 'Quota' trong README.%n", totalAiFailed));
        }

        r.append("\nVI PHẠM BỊ BỎ LỌT (theo kiểu):\n");
        boolean anySlip = false;
        for (Map.Entry<String, StyleStat> e : byStyle.entrySet()) {
            for (Row row : e.getValue().slipped) {
                anySlip = true;
                r.append("  [").append(e.getKey()).append("] ").append(row.concept())
                        .append(" → ").append(trim(row.text())).append("\n");
            }
        }
        if (!anySlip) {
            r.append("  (không có — AI bắt hết mọi kiểu trên tập này)\n");
        }
        r.append("============================================================\n");

        Path report = writeReport("moderation-eval-robustness.txt", r.toString());

        int scoredTotal = byStyle.values().stream().mapToInt(s -> s.caught + s.missed).sum();
        System.out.printf("%n[robustness] scored=%d aiFailed=%d | bias gap: best '%s'=%.3f vs worst '%s'=%.3f%n",
                scoredTotal, totalAiFailed, bestStyle, Math.max(bestRecall, 0), worstStyle, Math.min(worstRecall, 1));
        System.out.println("[robustness] full UTF-8 report: " + report.toAbsolutePath());

        assertThat(scoredTotal)
                .as("Không chấm được mẫu nào — kiểm tra GEMINI_API_KEY / quota / GEMINI_MODELS")
                .isGreaterThan(0);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static Path writeReport(String name, String content) throws Exception {
        Path out = Path.of("target", name);
        Files.createDirectories(out.getParent());
        Files.writeString(out, content, StandardCharsets.UTF_8);
        return out;
    }

    private static List<Row> loadDataset(String resource) throws Exception {
        List<Row> out = new ArrayList<>();
        try (InputStream in = GeminiModerationRobustnessEvalTest.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException("Không tìm thấy dataset: " + resource);
            }
            try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                String line = br.readLine(); // bỏ header
                while ((line = br.readLine()) != null) {
                    if (line.isBlank()) {
                        continue;
                    }
                    List<String> cols = parseCsvLine(line);
                    if (cols.size() < 3) {
                        continue;
                    }
                    out.add(new Row(cols.get(0).trim(), cols.get(1).trim(), cols.get(2)));
                }
            }
        }
        // Gom mẫu cùng style gần nhau để bảng đọc tự nhiên.
        out.sort(Comparator.comparing(Row::style));
        return out;
    }

    /** CSV tối giản: phân tách bằng dấu phẩy, trường có thể bọc trong "...", "" = một dấu nháy. */
    private static List<String> parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        cur.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cur.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                fields.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        fields.add(cur.toString());
        return fields;
    }

    private static long parseLong(String v, long def) {
        try {
            return v == null || v.isBlank() ? def : Long.parseLong(v.trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static String trim(String s) {
        String oneLine = s.replaceAll("\\s+", " ").trim();
        return oneLine.length() > 120 ? oneLine.substring(0, 117) + "..." : oneLine;
    }
}
