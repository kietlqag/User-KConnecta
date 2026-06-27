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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bộ ĐÁNH GIÁ (không phải unit test) cho bộ phân loại kiểm duyệt AI tier-2
 * ({@link GeminiModerationService#moderate(String)}) — đo precision / recall / F1 /
 * accuracy / false-positive-rate trên một tập mẫu tiếng Việt đã gán nhãn.
 *
 * <p><b>Phạm vi:</b> đo RIÊNG tầng LLM, đứng độc lập — KHÔNG phải hành vi pipeline thật.
 * Trong production AI chỉ chạy với nội dung đã bị tầng 1 ({@code isSuspect}) gắn cờ; ở đây
 * ta chạy AI trên TẤT CẢ mẫu để đo chất lượng bản thân bộ phân loại. Lớp dương = VI PHẠM →
 * recall = "tỉ lệ vi phạm bắt được".
 *
 * <p><b>Tính hợp lệ của dữ liệu:</b> {@code dataset.csv} chỉ là TẬP HẠT GIỐNG minh họa. Để
 * con số có giá trị bảo vệ KLTN, hãy MỞ RỘNG bằng dữ liệu THẬT do người gán nhãn. Mọi con
 * số đi kèm cỡ mẫu N (in trong báo cáo) — N nhỏ thì mỗi mẫu sai làm lệch chỉ số vài điểm %.
 *
 * <h3>GIẢI THÍCH 4 KÝ HIỆU TP/FN/FP/TN &amp; CÁC CÔNG THỨC (đọc trước khi xem báo cáo)</h3>
 * Lớp dương (positive) = VI PHẠM. Mỗi bài rơi vào ĐÚNG 1 trong 4 ô, tùy đáp án người gán
 * nhãn (hàng) so với phán quyết của AI (cột):
 * <pre>
 *                          AI nói "VI PHẠM"     AI nói "SẠCH"
 *   Người gán: VI PHẠM        TP (đúng)           FN (bỏ lọt)   ← FN nguy hiểm nhất
 *   Người gán: SẠCH           FP (chặn nhầm)      TN (đúng)
 * </pre>
 * <ul>
 *   <li><b>TP</b> (True Positive)  – bài vi phạm và AI bắt ĐÚNG.</li>
 *   <li><b>FN</b> (False Negative) – bài vi phạm nhưng AI cho qua → <b>BỎ LỌT</b> nội dung
 *       độc hại (rủi ro an toàn — đáng lo nhất).</li>
 *   <li><b>FP</b> (False Positive) – bài sạch nhưng AI chặn → <b>CHẶN NHẦM</b> (làm phiền
 *       người dùng).</li>
 *   <li><b>TN</b> (True Negative)  – bài sạch và AI cho qua ĐÚNG.</li>
 * </ul>
 * Từ 4 ô đó tính ra các điểm số (giá trị 0..1, càng gần 1 càng tốt):
 * <ul>
 *   <li><b>Precision</b> = TP / (TP + FP) — trong các bài AI GẮN CỜ, bao nhiêu thực sự vi phạm.</li>
 *   <li><b>Recall</b>    = TP / (TP + FN) — trong các bài THỰC SỰ vi phạm, AI bắt được bao nhiêu.</li>
 *   <li><b>F1</b>        = 2·P·R / (P + R) — trung bình hài hòa của Precision &amp; Recall (1 số gọn).</li>
 *   <li><b>Accuracy</b>  = (TP + TN) / tổng đã chấm — tỉ lệ chấm đúng nói chung.</li>
 *   <li><b>FPR</b>       = FP / (FP + TN) — tỉ lệ bài sạch bị chặn nhầm.</li>
 * </ul>
 * <b>Ví dụ:</b> TP=22, FN=0, FP=0, TN=23 → Precision = 22/(22+0) = 1.000;
 * Recall = 22/(22+0) = 1.000; F1 = 1.000. Nếu AI bỏ lọt 2 bài (FN=2 thay vì 0) thì
 * Recall tụt còn 22/(22+2) = 0.917 — đó là lý do "cỡ mẫu nhỏ, mỗi mẫu sai lệch vài %".
 *
 * <p><b>Quota free tier Gemini = 10 request/phút/model.</b> Vì vậy harness mặc định nghỉ
 * {@code EVAL_DELAY_MS=7000} (~8.5 req/phút, dưới ngưỡng) và tự RETRY các mẫu bị 429 sau
 * cooldown. Cấu hình qua biến môi trường:
 * <pre>
 *   $env:GEMINI_API_KEY="..."                 # bắt buộc; thiếu thì test tự bỏ qua
 *   $env:GEMINI_MODELS="gemini-2.5-flash-lite" # NÊN ghim 1 model (không ghim = thử 5 model/mẫu, hết quota nhanh gấp 5)
 *   $env:EVAL_DELAY_MS="7000"                 # nghỉ giữa các lần gọi (ms)
 *   $env:EVAL_MAX_RETRIES="2"                 # số vòng thử lại cho mẫu bị 429
 *   $env:EVAL_RETRY_COOLDOWN_MS="65000"       # nghỉ trước mỗi vòng retry (ms)
 *   ./mvnw "-Dtest=GeminiModerationEvalTest" test
 * </pre>
 * Báo cáo đầy đủ (UTF-8) ghi ra {@code target/moderation-eval-precision-recall.txt} —
 * console Windows hay vỡ mã tiếng Việt nên CHỈ in tóm tắt ASCII + đường dẫn file.
 */
@EnabledIfEnvironmentVariable(named = "GEMINI_API_KEY", matches = ".+")
class GeminiModerationEvalTest {

    private record Sample(String id, boolean expectedViolation, String category, String text) {}

    private record Miss(Sample sample, String aiReason) {}

    @Test
    void evaluateModerationClassifier() throws Exception {
        String apiKey = System.getenv("GEMINI_API_KEY");
        String models = Optional.ofNullable(System.getenv("GEMINI_MODELS")).orElse("");
        long delayMs = parseLong(System.getenv("EVAL_DELAY_MS"), 7000L);
        int maxRetries = (int) parseLong(System.getenv("EVAL_MAX_RETRIES"), 0L);
        long cooldownMs = parseLong(System.getenv("EVAL_RETRY_COOLDOWN_MS"), 65000L);
        int maxConsecFails = (int) parseLong(System.getenv("EVAL_MAX_CONSECUTIVE_FAILS"), 5L);

        GeminiModerationService service = new GeminiModerationService(new ObjectMapper(), apiKey, models);
        // Đổi tập test qua EVAL_DATASET (vd "/moderation-eval/dataset-hard.csv" để chạy tập biên).
        String datasetPath = Optional.ofNullable(System.getenv("EVAL_DATASET")).orElse("/moderation-eval/dataset.csv");
        List<Sample> dataset = loadDataset(datasetPath);

        // Confusion matrix — positive class = VI PHẠM.
        int tp = 0, fn = 0, fp = 0, tn = 0;
        List<Miss> falseNegatives = new ArrayList<>();
        List<Miss> falsePositives = new ArrayList<>();

        // Vòng chính + (tùy chọn) retry. CÓ "CẦU DAO": nếu AI_FAILED nhiều lần LIÊN TIẾP thì
        // dừng ngay — dấu hiệu cạn quota (nhất là quota THEO NGÀY/RPD, retry không cứu được).
        boolean aborted = false;
        String abortNote = null;
        List<Sample> pending = new ArrayList<>(dataset);
        for (int round = 0; round <= maxRetries && !pending.isEmpty() && !aborted; round++) {
            if (round > 0) {
                System.out.printf("[eval] retry round %d/%d for %d failed sample(s), cooldown %ds...%n",
                        round, maxRetries, pending.size(), cooldownMs / 1000);
                Thread.sleep(cooldownMs);
            }
            List<Sample> stillFailed = new ArrayList<>();
            int consecFails = 0;
            for (int i = 0; i < pending.size(); i++) {
                Sample s = pending.get(i);
                Optional<GeminiModerationService.ModerationResult> result = service.moderate(s.text());
                if (result.isEmpty()) {
                    stillFailed.add(s);
                    if (++consecFails >= maxConsecFails) {
                        stillFailed.addAll(pending.subList(i + 1, pending.size()));
                        aborted = true;
                        abortNote = consecFails + " lần AI_FAILED LIÊN TIẾP — nhiều khả năng CẠN QUOTA "
                                + "(đặc biệt quota theo NGÀY); dừng sớm để khỏi phí thời gian.";
                        break;
                    }
                } else {
                    consecFails = 0;
                    boolean predictedViolation = !result.get().safe(); // AI nói "không safe" = vi phạm
                    String reason = result.get().reason();
                    // Đối chiếu đáp án người (s.expectedViolation) với phán quyết AI → 1 trong 4 ô:
                    if (s.expectedViolation() && predictedViolation) {
                        tp++;                                   // người: vi phạm | AI: vi phạm  → TP (bắt đúng)
                    } else if (s.expectedViolation()) {
                        fn++;                                   // người: vi phạm | AI: sạch     → FN (BỎ LỌT)
                        falseNegatives.add(new Miss(s, reason)); // lưu lại để in ra phân tích điểm yếu
                    } else if (predictedViolation) {
                        fp++;                                   // người: sạch    | AI: vi phạm  → FP (CHẶN NHẦM)
                        falsePositives.add(new Miss(s, reason));
                    } else {
                        tn++;                                   // người: sạch    | AI: sạch     → TN (đúng)
                    }
                }
                if (delayMs > 0) {
                    Thread.sleep(delayMs);
                }
            }
            pending = stillFailed;
        }
        List<Sample> aiFailed = pending; // không bao giờ trả verdict (hết quota/lỗi)

        // ── Tính các chỉ số từ 4 ô (xem bảng giải thích ở Javadoc đầu lớp) ──
        int evaluated = tp + fn + fp + tn;                  // tổng số bài thực sự chấm được (loại AI_FAILED)
        double precision = safeDiv(tp, tp + fp);            // TP / (TP+FP): bài AI gắn cờ có bao nhiêu là đúng
        double recall = safeDiv(tp, tp + fn);               // TP / (TP+FN): vi phạm thật bắt được bao nhiêu
        double f1 = (precision + recall) == 0 ? 0 : 2 * precision * recall / (precision + recall); // hài hòa P & R
        double accuracy = safeDiv(tp + tn, evaluated);      // (TP+TN) / tổng: tỉ lệ chấm đúng nói chung
        double fpr = safeDiv(fp, fp + tn);                  // FP / (FP+TN): tỉ lệ bài sạch bị chặn nhầm
        // safeDiv = chia an toàn, mẫu số 0 thì trả 0 (tránh lỗi chia cho 0 khi chưa có mẫu nào).
        double violationRate = dataset.isEmpty() ? 0
                : 100.0 * (tp + fn + countExpected(aiFailed, true)) / dataset.size();
        double recallSwingPerMiss = (tp + fn) == 0 ? 0 : 100.0 / (tp + fn);

        StringBuilder r = new StringBuilder();
        r.append("============================================================\n");
        r.append(" ĐÁNH GIÁ BỘ PHÂN LOẠI KIỂM DUYỆT AI (Gemini, tier-2, độc lập)\n");
        r.append("============================================================\n");
        r.append(String.format("Dataset        : %s%n", datasetPath));
        r.append(String.format("Model cấu hình : %s%n", models.isBlank() ? "(mặc định — dò fallback; xem log INFO để biết model thắng)" : models));
        r.append(String.format("Tổng mẫu       : %d  (vi phạm chiếm ~%.0f%%)%n", dataset.size(), violationRate));
        r.append(String.format("AI thất bại     : %d  (Optional.empty — loại khỏi tính chỉ số; production = fail-closed)%n", aiFailed.size()));
        r.append(String.format("Mẫu đã chấm     : %d%n", evaluated));
        r.append("------------------------------------------------------------\n");
        r.append("Ma trận nhầm lẫn (lớp dương = VI PHẠM):\n");
        r.append(String.format("  TP (bắt đúng vi phạm)     = %d%n", tp));
        r.append(String.format("  FN (BỎ LỌT vi phạm)       = %d   <-- rủi ro an toàn nội dung%n", fn));
        r.append(String.format("  FP (CHẶN NHẦM bài sạch)   = %d   <-- rủi ro trải nghiệm%n", fp));
        r.append(String.format("  TN (bỏ qua đúng bài sạch) = %d%n", tn));
        r.append("------------------------------------------------------------\n");
        r.append(String.format("  Precision (độ chính xác cờ vi phạm) = %.3f%n", precision));
        r.append(String.format("  Recall    (tỉ lệ vi phạm bắt được)  = %.3f%n", recall));
        r.append(String.format("  F1                                  = %.3f%n", f1));
        r.append(String.format("  Accuracy                            = %.3f%n", accuracy));
        r.append(String.format("  False-Positive-Rate (chặn nhầm)     = %.3f%n", fpr));
        r.append("------------------------------------------------------------\n");
        r.append("LƯU Ý KHI TRÍCH DẪN:\n");
        r.append(String.format("  - Cỡ mẫu nhỏ: mỗi vi phạm bị bỏ lọt làm recall đổi ~%.1f điểm %%.%n", recallSwingPerMiss));
        r.append("  - Đây là AI tier-2 ĐỘC LẬP, không phải pipeline production (tier-1 lọc trước).\n");
        r.append("  - Tập cân bằng làm precision 'đẹp' hơn thực tế (nội dung thật đa số là sạch).\n");
        r.append("  - dataset.csv là tập hạt giống — mở rộng bằng nhãn người thật trước khi báo cáo.\n");
        if (aborted) {
            r.append("  - !!! DỪNG SỚM: ").append(abortNote).append("\n");
            r.append("    → Quota free tier model này có thể là GIỚI HẠN THEO NGÀY (RPD) — throttle/retry KHÔNG cứu được.\n");
            r.append("    → Bucket ngày tính RIÊNG theo model: đổi GEMINI_MODELS sang model khác là có hạn ngạch mới.\n");
            r.append("    → Xem mục 'Quota' trong README (đổi model / giảm dataset / bật billing / chờ reset).\n");
        } else if (!aiFailed.isEmpty()) {
            r.append(String.format("  - CÒN %d mẫu AI_FAILED. Xem mục 'Quota' trong README.%n", aiFailed.size()));
        }

        appendMisses(r, "FALSE NEGATIVES — vi phạm AI bỏ lọt (đáng lo nhất, bàn trong KLTN)", falseNegatives);
        appendMisses(r, "FALSE POSITIVES — bài sạch AI chặn nhầm", falsePositives);
        if (!aiFailed.isEmpty()) {
            r.append("\nAI THẤT BẠI (không có verdict) ").append(aiFailed.size()).append(" mẫu:\n");
            for (Sample s : aiFailed) {
                r.append("  #").append(s.id()).append(" [").append(s.category()).append("] ").append(trim(s.text())).append("\n");
            }
        }
        r.append("============================================================\n");

        String base = datasetPath.substring(datasetPath.lastIndexOf('/') + 1).replaceFirst("\\.csv$", "");
        Path report = writeReport("moderation-eval-pr-" + base + ".txt", r.toString());

        // Console Windows hay vỡ mã UTF-8 → chỉ in tóm tắt ASCII + đường dẫn file đầy đủ.
        System.out.printf("%n[eval] scored=%d aiFailed=%d | TP=%d FN=%d FP=%d TN=%d "
                        + "| precision=%.3f recall=%.3f f1=%.3f acc=%.3f fpr=%.3f%n",
                evaluated, aiFailed.size(), tp, fn, fp, tn, precision, recall, f1, accuracy, fpr);
        System.out.println("[eval] full UTF-8 report: " + report.toAbsolutePath());

        assertThat(evaluated)
                .as("Không chấm được mẫu nào — kiểm tra GEMINI_API_KEY / quota / GEMINI_MODELS")
                .isGreaterThan(0);
        // Muốn biến thành gác cổng chất lượng, bỏ comment và tự chọn ngưỡng:
        // assertThat(recall).as("Recall dưới ngưỡng an toàn").isGreaterThanOrEqualTo(0.80);
        // assertThat(precision).as("Precision dưới ngưỡng").isGreaterThanOrEqualTo(0.70);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static Path writeReport(String name, String content) throws Exception {
        Path out = Path.of("target", name);
        Files.createDirectories(out.getParent());
        Files.writeString(out, content, StandardCharsets.UTF_8);
        return out;
    }

    private static void appendMisses(StringBuilder r, String title, List<Miss> misses) {
        r.append("\n").append(title).append(" (").append(misses.size()).append("):\n");
        if (misses.isEmpty()) {
            r.append("  (không có)\n");
            return;
        }
        for (Miss m : misses) {
            r.append("  #").append(m.sample().id()).append(" [").append(m.sample().category()).append("] ")
                    .append(trim(m.sample().text())).append("\n");
            if (m.aiReason() != null && !m.aiReason().isBlank()) {
                r.append("      AI lý do: ").append(trim(m.aiReason())).append("\n");
            }
        }
    }

    private static List<Sample> loadDataset(String resource) throws Exception {
        List<Sample> out = new ArrayList<>();
        try (InputStream in = GeminiModerationEvalTest.class.getResourceAsStream(resource)) {
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
                    if (cols.size() < 4) {
                        continue;
                    }
                    boolean violation = "VIOLATION".equalsIgnoreCase(cols.get(1).trim());
                    out.add(new Sample(cols.get(0).trim(), violation, cols.get(2).trim(), cols.get(3)));
                }
            }
        }
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

    private static int countExpected(List<Sample> samples, boolean violation) {
        return (int) samples.stream().filter(s -> s.expectedViolation() == violation).count();
    }

    private static double safeDiv(int num, int den) {
        return den == 0 ? 0.0 : (double) num / den;
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
        return oneLine.length() > 140 ? oneLine.substring(0, 137) + "..." : oneLine;
    }
}
