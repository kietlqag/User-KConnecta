    # Đánh giá bộ phân loại kiểm duyệt AI (precision / recall)

Bộ công cụ này đo định lượng **bộ phân loại kiểm duyệt AI tier-2** (`GeminiModerationService.moderate`)
— trả lời trực tiếp câu phản biện *"Độ chính xác của kiểm duyệt AI là bao nhiêu? Đo trên dataset nào?"*

## Thành phần

| File | Vai trò |
|---|---|
| `dataset.csv` | Tập mẫu tiếng Việt đã gán nhãn (`VIOLATION` / `CLEAN`). **Tập hạt giống — phải mở rộng.** |
| `../../java/.../feature/ai/GeminiModerationEvalTest.java` | Bộ chạy đánh giá, in confusion matrix + precision/recall/F1/accuracy/FPR. |

## Cách chạy (PowerShell)

```powershell
$env:GEMINI_API_KEY = "khoa-that-cua-ban"
$env:GEMINI_MODELS  = "gemini-2.5-flash-lite"   # NÊN ghim 1 model có thật (xem mục Quota)
./mvnw "-Dtest=GeminiModerationEvalTest" test
```

> ⚠️ **QUOTA FREE TIER GEMINI CÓ HAI MỨC — và mức theo NGÀY mới là rào cản thật.**
> Free tier giới hạn cả **theo phút (RPM)** lẫn **theo ngày (RPD, ví dụ `gemini-2.5-flash-lite`
> ≈ 20 request/NGÀY)**. Với dataset ~46 mẫu, **mức theo ngày sẽ cạn trước** → phần lớn mẫu thành
> `AI_FAILED`. **Throttle/retry KHÔNG cứu được mức theo ngày** (đã kiểm chứng thực tế: giãn 7s/lần
> vẫn fail 45/46 vì hạn ngạch ngày đã hết).
>
> **Cách lấy được số liệu — chọn 1:**
> 1. **Đổi sang model free-tier có RPD cao hơn.** Bucket ngày tính **RIÊNG theo model**, nên đổi
>    `GEMINI_MODELS` sang model khác là có **hạn ngạch ngày mới ngay** (không tốn tiền, không chờ).
>    Tra hạn mức hiện hành: <https://ai.google.dev/gemini-api/docs/rate-limits>. **Quy tắc:** chọn 1
>    model có **RPD ≥ số mẫu** và *thực sự phản hồi* (chạy thử 2–3 mẫu đầu thấy có verdict là được —
>    đồng thời trả lời luôn Q63 "model nào thật sự gọi được").
> 2. **Bật billing (paid tier)** — bỏ giới hạn RPD, ~vài cent cho ~86 lần gọi nhỏ, chạy 1 lần ra số
>    sạch. Đáng tin nhất nếu cần số **trích dẫn trong KLTN**. (Tốn tiền — em tự quyết.)
> 3. **Chạy nhiều ngày**, mỗi ngày một phần dataset, **dùng CÙNG 1 model**, gộp kết quả thủ công.
>
> **Lưu ý phương pháp:** **dùng đúng MỘT model cho cả lượt P/R** (và cả lượt robustness). Trộn nhiều
> model = trộn nhiều bộ phân loại → con số không mô tả cái gì cả.
>
> **Harness tự bảo vệ:** nếu gặp **5 lần `AI_FAILED` LIÊN TIẾP** (mặc định `EVAL_MAX_CONSECUTIVE_FAILS`)
> nó **dừng sớm** thay vì phí thời gian đập vào quota đã cạn, và in hướng dẫn. Các biến tinh chỉnh:
> `EVAL_DELAY_MS` (7000, tôn trọng mức phút), `EVAL_MAX_RETRIES` (0 — retry vô nghĩa với cap ngày),
> `EVAL_MAX_CONSECUTIVE_FAILS` (5).

**Báo cáo đầy đủ (UTF-8)** ghi ra file — console Windows hay vỡ mã tiếng Việt nên chỉ in
tóm tắt ASCII + đường dẫn file:

| Test | File báo cáo |
|---|---|
| `GeminiModerationEvalTest` | `target/moderation-eval-precision-recall.txt` |
| `GeminiModerationRobustnessEvalTest` | `target/moderation-eval-robustness.txt` |

> Mở file bằng editor UTF-8 (VS Code...) hoặc chụp làm phụ lục KLTN. File trong `target/`
> sẽ mất khi `mvn clean` — nhớ copy ra nơi khác nếu muốn giữ.

> Test bị **gate bằng `@EnabledIfEnvironmentVariable`** — nếu không đặt `GEMINI_API_KEY`,
> nó tự **bỏ qua**, nên `mvn test`/CI bình thường không tốn quota.

## Đọc kết quả

Lớp dương (positive) = **VI PHẠM**. Bốn ô ma trận:

- **TP** – vi phạm, AI gắn cờ đúng.
- **FN** – vi phạm nhưng AI cho qua → **bỏ lọt nội dung độc hại** (rủi ro nghiêm trọng nhất).
- **FP** – bài sạch nhưng AI chặn → **chặn nhầm người dùng** (rủi ro trải nghiệm).
- **TN** – bài sạch, AI cho qua đúng.

Chỉ số:
- **Recall** = TP/(TP+FN) — tỉ lệ vi phạm bắt được (chỉ số an toàn quan trọng nhất).
- **Precision** = TP/(TP+FP) — trong số bài bị gắn cờ, bao nhiêu thực sự vi phạm.
- **FPR** = FP/(FP+TN) — tỉ lệ chặn nhầm bài sạch.

Báo cáo còn liệt kê **từng mẫu FN/FP kèm lý do AI đưa ra** — dùng đúng các mẫu này để
phân tích điểm yếu trong KLTN (ví dụ AI hay bỏ lọt teencode / nội dung làm mờ ký tự).

## Giới hạn phải nêu khi trích dẫn (quan trọng cho bảo vệ)

1. **Cỡ mẫu nhỏ** → mọi con số đi kèm N (in trong báo cáo). Mỗi vi phạm bỏ lọt làm recall
   lệch vài điểm %. Muốn số đáng tin → **mở rộng dataset**.
2. **Nhãn do người làm, nhiều người càng tốt.** Đừng để AI tự gán nhãn rồi chấm chính nó —
   hội đồng sẽ hỏi *"ai lập ground truth?"*. Lý tưởng: nhãn từ dữ liệu/báo cáo thật, có
   đối chiếu giữa nhiều người gán nhãn.
3. **Đây là AI tier-2 đứng độc lập, KHÔNG phải pipeline production.** Thực tế AI chỉ chạy
   với nội dung đã bị tier-1 (`PolicyContentValidator.isSuspect`) gắn cờ nghi ngờ.
4. **Tập cân bằng làm precision đẹp hơn thực tế** (nội dung thật đa số là sạch → base rate
   khác). Nêu rõ điều này.
5. **AI_FAILED** (Gemini trả rỗng do hết quota/lỗi) được tách riêng, không tính vào chỉ số;
   production xử lý theo **fail-closed** (ẩn chờ admin duyệt).

## Mở rộng dataset

Mở `dataset.csv` bằng Excel/Google Sheets (hoặc trình soạn thảo), thêm dòng:

```
id,expected,category,text
47,CLEAN,clean,"Một bài viết bình thường khác..."
48,VIOLATION,hate,"Một mẫu vi phạm thật, đã được người gán nhãn..."
```

- `expected`: `VIOLATION` hoặc `CLEAN`.
- `text`: nếu có dấu phẩy thì **bọc trong dấu nháy kép** `"..."`.
- Cân bằng số mẫu hai nhãn và **đa dạng** (teencode, nói lái, làm mờ ký tự, mỉa mai, tin tức
  tường thuật bạo lực nhưng không vi phạm...) để đo cả FN lẫn FP.

## Tập biên (challenge set) — để có số liệu ĐÁNG TIN

`dataset.csv` toàn ca **rõ ràng** → model dễ đạt P=R=1.0, mà điểm tuyệt đối **gây nghi ngờ**
khi bảo vệ. `dataset-hard.csv` chứa **18 ca biên** — đúng chỗ bộ kiểm duyệt LLM hay sai:

- **CLEAN nhưng dễ bị chặn nhầm (FP):** trích dẫn để lên án thù ghét, tin tức tường thuật bạo
  lực, cảnh báo y tế đúng (nhắc "tử vong"), phòng chống tự tử, giáo dục giới tính, phê bình
  chính trị gay gắt, trích truyện hư cấu, nạn nhân hỏi cách trình báo.
- **VIOLATION nhưng tinh vi, dễ bỏ lọt (FN):** đe dọa ngụ ý ("gặp hỏa hoạn"), scam đầu tư/tình
  cảm, gạ "bố nuôi", ý định tự hại nói tránh ("đi xa"), tin sai kiểu "chỉ hỏi thôi", thù ghét
  ám chỉ ("bọn họ"), quấy rối ngụ ý, scam "chốt đơn".

Chạy tập biên (đổi `EVAL_DATASET`); báo cáo ghi ra `target/moderation-eval-pr-dataset-hard.txt`:

```powershell
$env:GEMINI_API_KEY = "khoa-cua-ban"
$env:GEMINI_MODELS  = "gemini-3.1-flash-lite"
$env:EVAL_DATASET   = "/moderation-eval/dataset-hard.csv"
./mvnw "-Dtest=GeminiModerationEvalTest" test
```

> **Câu chuyện cho KLTN:** báo cáo **CẢ HAI** — "tập rõ ràng: P=R=1.0" + "tập biên: P/R thấp hơn,
> lộ N ca FN/FP". Cái gap đó mới là đánh giá thật, và phần FN/FP là tư liệu phân tích điểm yếu.
>
> ⚠️ **Nhãn tập biên là cố ý GÂY TRANH LUẬN** — em PHẢI tự rà lại theo đúng chính sách nền tảng
> KConnecta (vd "phê bình chính trị" là CLEAN hay không tùy chính sách). Việc tự quyết nhãn ca
> biên chính là lúc em **định nghĩa chính sách kiểm duyệt** — một đóng góp đáng viết vào KLTN.
> Báo cáo in sẵn danh sách FN/FP để em đối chiếu nhãn của mình với phán quyết của AI.

## Đánh giá độ bền ngôn ngữ — teencode / bỏ dấu / làm mờ / nói lái (Q87)

Trả lời câu *"Gemini kiểm duyệt tiếng Việt có tốt như tiếng Anh không, đã kiểm chứng chưa?"*

| File | Vai trò |
|---|---|
| `dataset-robustness.csv` | Cùng một vi phạm, viết theo nhiều `style`: `plain_vi`, `teencode`, `no_diacritics`, `obfuscated`, `english`. |
| `../../java/.../feature/ai/GeminiModerationRobustnessEvalTest.java` | Đo **recall theo từng kiểu** + **bias gap** (chênh lệch kiểu tốt nhất vs tệ nhất). |

Chạy giống trên, chỉ đổi tên test:

```powershell
$env:GEMINI_API_KEY = "khoa-cua-ban"
$env:GEMINI_MODELS  = "gemini-2.5-flash-lite"
./mvnw "-Dtest=GeminiModerationRobustnessEvalTest" test
```

**Đọc kết quả:** mọi mẫu đều là vi phạm nên lý tưởng recall = 1.000 ở mọi kiểu. Nếu recall
ở `teencode` / `no_diacritics` / `obfuscated` **thấp hơn** `english` / `plain_vi` → đó là
**bằng chứng định lượng của điểm mù ngôn ngữ**. Báo cáo in sẵn dòng *bias gap* và liệt kê
từng vi phạm bị bỏ lọt theo kiểu (dùng làm ví dụ phân tích trong KLTN).

**Thêm kiểu `noi_lai`:** nói lái phụ thuộc ngữ cảnh, khó sinh tự động cho đúng — **em tự
thêm** vào `dataset-robustness.csv` các dòng `concept,noi_lai,"..."` bằng ví dụ thật do
người curate. Harness nhận mọi giá trị `style` động nên thêm vào là chạy được ngay. Đây
cũng là cách trả lời trung thực: *"em đã đo trên teencode/bỏ dấu/làm mờ; nói lái cần tập
người gán nhãn, đang mở rộng."*

## Liên quan câu phản biện khác

- **Q63 (model fallback có tên model lạ):** chạy bộ này sẽ lộ model nào thật sự phản hồi
  (xem log `Gemini call succeeded with model ...`) và đếm `AI_FAILED`. Hãy **ghim
  `GEMINI_MODELS`** vào model đã xác nhận để tránh dò vô ích.
