import React, { useState } from 'react';
import {
  Shield, FileText, Lock,
  AlertTriangle, AlertOctagon, Ban, Info,
  ChevronDown, ChevronUp, XCircle,
} from 'lucide-react';
import { usePublicPolicies } from '@/hooks/usePublicPolicies';
import { Header } from '@/features/home/components/Header/Header';
import type { PublicCommunityRule } from '@/types/policy';

// ─── Static enrichment map ──────────────────────────────────────────────────
// API chỉ trả về label ngắn + description ngắn.
// Map này bổ sung "Là gì" + ví dụ thực tế cho người dùng phổ thông.

interface RuleDetail {
  what: string;       // giải thích ngắn "là gì"
  examples: string[]; // 2–3 ví dụ cụ thể
}

const RULE_DETAILS: Record<string, RuleDetail> = {
  'nội dung vi phạm pháp luật': {
    what: 'Đăng nội dung bị pháp luật Việt Nam nghiêm cấm.',
    examples: [
      'Tuyên truyền chống phá nhà nước',
      'Tài liệu hướng dẫn buôn bán ma túy, vũ khí',
      'Nội dung xâm phạm bản quyền nghiêm trọng',
    ],
  },
  'nội dung 18+': {
    what: 'Hình ảnh, video hoặc mô tả có tính chất tình dục, khiêu dâm.',
    examples: [
      'Ảnh hoặc clip khỏa thân, nhạy cảm',
      'Mô tả tình dục chi tiết trong bình luận',
      'Đường link dẫn đến trang web người lớn',
    ],
  },
  'lừa đảo': {
    what: 'Cố tình lấy tiền hoặc thông tin cá nhân của người khác bằng thủ đoạn gian dối.',
    examples: [
      'Giả mạo ngân hàng để xin mã OTP',
      'Kêu gọi chuyển tiền với lý do giả mạo',
      'Đăng link website giả mạo để ăn cắp mật khẩu',
    ],
  },
  'bạo lực': {
    what: 'Đăng nội dung kêu gọi làm hại người khác hoặc đe dọa trực tiếp.',
    examples: [
      '"Tao biết nhà mày, coi chừng" — đe dọa cá nhân',
      'Kêu gọi đánh hội đồng một người cụ thể',
      'Đăng video/ảnh bạo lực gây kinh sợ',
    ],
  },
  'toxic / xúc phạm': {
    what: 'Tấn công hoặc miệt thị người khác dựa trên giới tính, tôn giáo, dân tộc, ngoại hình...',
    examples: [
      'Bình luận phân biệt vùng miền, kỳ thị dân tộc',
      'Miệt thị ngoại hình, chế giễu người khuyết tật',
      'Lăng mạ, chửi bới cá nhân trong bình luận',
    ],
  },
  'fake news': {
    what: 'Đăng thông tin sai sự thật, chưa kiểm chứng, có thể gây hoang mang hoặc thiệt hại cho người khác.',
    examples: [
      'Tin bịa đặt về dịch bệnh hoặc thảm họa',
      'Thông tin giả mạo về nhân vật nổi tiếng',
      'Số liệu thống kê bịa đặt được trình bày như thật',
    ],
  },
  'spam': {
    what: 'Đăng liên tục nội dung trùng lặp, quảng cáo không liên quan, hoặc gửi tin nhắn hàng loạt.',
    examples: [
      'Đăng cùng một bài viết 10 lần trong 1 giờ',
      'Bình luận chèn link bán hàng vào mọi bài viết',
      'Gửi tin nhắn quảng cáo hàng loạt cho người lạ',
    ],
  },
};

function getRuleDetail(label: string): RuleDetail | null {
  return RULE_DETAILS[label.toLowerCase().trim()] ?? null;
}

// ─── Severity config ─────────────────────────────────────────────────────────

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

interface SeverityConfig {
  label: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  headerBg: string;
  headerText: string;
  headerBorder: string;
  icon: React.ReactNode;
}

const SEVERITY_CONFIG: Record<string, SeverityConfig> = {
  critical: {
    label: 'Nghiêm trọng',
    borderColor: 'border-l-red-500',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    headerBg: 'bg-red-50',
    headerText: 'text-red-800',
    headerBorder: 'border-red-200',
    icon: <Ban className="w-4 h-4" />,
  },
  high: {
    label: 'Cao',
    borderColor: 'border-l-orange-500',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    headerBg: 'bg-orange-50',
    headerText: 'text-orange-800',
    headerBorder: 'border-orange-200',
    icon: <AlertOctagon className="w-4 h-4" />,
  },
  medium: {
    label: 'Trung bình',
    borderColor: 'border-l-yellow-500',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-700',
    headerBg: 'bg-yellow-50',
    headerText: 'text-yellow-800',
    headerBorder: 'border-yellow-200',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  low: {
    label: 'Thấp',
    borderColor: 'border-l-gray-400',
    badgeBg: 'bg-gray-100 dark:bg-gray-900',
    badgeText: 'text-gray-600 dark:text-gray-400',
    headerBg: 'bg-gray-50 dark:bg-gray-900',
    headerText: 'text-gray-700 dark:text-gray-300',
    headerBorder: 'border-gray-200 dark:border-gray-700',
    icon: <Info className="w-4 h-4" />,
  },
};

function getSeverityConfig(severity: string): SeverityConfig {
  return SEVERITY_CONFIG[severity.toLowerCase()] ?? {
    label: severity,
    borderColor: 'border-l-gray-300',
    badgeBg: 'bg-gray-100 dark:bg-gray-900',
    badgeText: 'text-gray-600 dark:text-gray-400',
    headerBg: 'bg-gray-50 dark:bg-gray-900',
    headerText: 'text-gray-700 dark:text-gray-300',
    headerBorder: 'border-gray-200 dark:border-gray-700',
    icon: <Info className="w-4 h-4" />,
  };
}

// ─── Group rules by severity ─────────────────────────────────────────────────

function groupRules(rules: PublicCommunityRule[]) {
  const map: Record<string, PublicCommunityRule[]> = {};
  for (const rule of rules) {
    const key = rule.severity.toLowerCase();
    if (!map[key]) map[key] = [];
    map[key].push(rule);
  }
  return SEVERITY_ORDER.filter((s) => map[s]?.length).map((s) => ({
    severity: s,
    rules: map[s],
  }));
}

// ─── Accordion group component ───────────────────────────────────────────────

function RuleGroup({ severity, rules }: { severity: string; rules: PublicCommunityRule[] }) {
  const cfg = getSeverityConfig(severity);
  const [open, setOpen] = useState(severity === 'critical' || severity === 'high');

  return (
    <div className={`rounded-xl border-2 ${cfg.headerBorder} overflow-hidden`}>
      {/* Header — clicable accordion trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${cfg.headerBg} text-left`}
      >
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 font-semibold text-sm ${cfg.headerText}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>
        {open
          ? <ChevronUp className={`w-4 h-4 ${cfg.headerText}`} />
          : <ChevronDown className={`w-4 h-4 ${cfg.headerText}`} />
        }
      </button>

      {/* Rule list */}
      {open && (
        <ul className="divide-y divide-gray-100">
          {rules.map((rule) => {
            const detail = getRuleDetail(rule.label);
            return (
              <li key={rule.id} className={`border-l-4 ${cfg.borderColor} px-4 py-4 bg-white dark:bg-gray-800`}>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{rule.label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {detail?.what ?? rule.description}
                </p>
                {(detail?.examples ?? (rule.description ? [rule.description] : [])).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Ví dụ thực tế</p>
                    <ul className="space-y-1">
                      {(detail?.examples ?? [rule.description]).map((ex) => (
                        <li key={ex} className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Escalation ladder (đọc từ violationPolicies của admin) ──────────────────

interface ViolationStep {
  offense: number;
  action: string;
  lockDays?: number;
}

const ACTION_TEXT: Record<string, string> = {
  warning: 'Cảnh cáo',
  lock_temp: 'Khóa tạm',
  ban_permanent: 'Ban vĩnh viễn',
};

function getEscalationSteps(fullConfig?: Record<string, unknown>): ViolationStep[] {
  const policies = fullConfig?.violationPolicies;
  if (!Array.isArray(policies) || policies.length === 0) return [];
  const def =
    (policies.find((p) => (p as { id?: string }).id === 'default') ?? policies[0]) as
      | { steps?: unknown }
      | undefined;
  const steps = def?.steps;
  if (!Array.isArray(steps)) return [];
  return (steps as ViolationStep[]).slice().sort((a, b) => a.offense - b.offense);
}

function stepText(step: ViolationStep): string {
  const action = ACTION_TEXT[step.action] ?? step.action;
  return step.action === 'lock_temp' && step.lockDays != null
    ? `${action} ${step.lockDays} ngày`
    : action;
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CommunityPoliciesPage() {
  const { data: policy, isLoading, isError } = usePublicPolicies();
  const escalationSteps = getEscalationSteps(policy?.fullConfig);

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-8">

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Chính sách cộng đồng</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Đọc để biết điều gì bị cấm và bạn sẽ bị xử lý thế nào nếu vi phạm.
        </p>
        {policy?.updatedAt && (
          <p className="text-xs text-gray-400 mb-6">
            Cập nhật lần cuối: {new Date(policy.updatedAt).toLocaleString('vi-VN')}
          </p>
        )}

        {isLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Đang tải chính sách…</p>
        ) : isError ? (
          <p className="text-red-600">Không tải được chính sách. Thử lại sau.</p>
        ) : policy ? (
          <div className="space-y-4">

            {/* Quy tắc cộng đồng */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-1">
                <Shield className="w-5 h-5 text-emerald-600" />
                Quy tắc cộng đồng
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Vi phạm nhiều lần sẽ bị nâng mức xử phạt. Bấm vào từng mục để xem chi tiết.
              </p>

              {escalationSteps.length > 0 && (
                <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">
                    Mức xử phạt theo số lần vi phạm
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {escalationSteps.map((step, i) => (
                      <React.Fragment key={step.offense}>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Lần {step.offense}:</span>
                          <span className="text-gray-600 dark:text-gray-400">{stepText(step)}</span>
                        </span>
                        {i < escalationSteps.length - 1 && (
                          <span className="text-gray-300" aria-hidden>→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {groupRules(policy.communityRules).map(({ severity, rules }) => (
                  <RuleGroup key={severity} severity={severity} rules={rules} />
                ))}
              </div>
            </section>

            {/* Bài viết & media */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-1">
                <FileText className="w-5 h-5 text-emerald-600" />
                Giới hạn bài viết &amp; media
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Mỗi bài đăng phải nằm trong giới hạn sau để đảm bảo trải nghiệm cho tất cả mọi người.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { label: 'Độ dài tối đa', value: `${policy.postPolicy.maxPostLength.toLocaleString()} ký tự / bài` },
                  { label: 'File đính kèm tối đa', value: `${policy.postPolicy.maxImagesPerPost} ảnh hoặc video / bài` },
                  { label: 'Dung lượng video', value: `Tối đa ${policy.postPolicy.maxVideoMb} MB` },
                  { label: 'Định dạng cho phép', value: policy.postPolicy.allowedFileTypes },
                  { label: 'Tần suất đăng', value: `Tối đa ${policy.postPolicy.postsPerMinute} bài / phút` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-2.5 gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Quyền riêng tư */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-1">
                <Lock className="w-5 h-5 text-emerald-600" />
                Quyền riêng tư &amp; dữ liệu của bạn
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                KConnecta lưu dữ liệu có thời hạn và cho phép bạn kiểm soát tài khoản của mình.
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: 'Lịch sử hoạt động',
                    value: `Lưu ${policy.privacy.logRetentionDays} ngày rồi tự động xóa`,
                  },
                  {
                    label: 'Tin nhắn',
                    value: `Lưu ${policy.privacy.chatRetentionDays} ngày rồi tự động xóa`,
                  },
                  {
                    label: 'Phiên đăng nhập',
                    value: `Tự đăng xuất sau ${policy.privacy.sessionMaxHours} giờ không hoạt động`,
                  },
                  {
                    label: 'Tải về dữ liệu cá nhân',
                    value: policy.privacy.allowDataExport
                      ? 'Bạn có thể tải về toàn bộ dữ liệu của mình'
                      : 'Chưa hỗ trợ',
                    highlight: policy.privacy.allowDataExport,
                  },
                  {
                    label: 'Xóa tài khoản',
                    value: policy.privacy.allowAccountDeletion
                      ? 'Bạn có thể xóa tài khoản bất kỳ lúc nào'
                      : 'Vui lòng liên hệ hỗ trợ để xóa tài khoản',
                    highlight: policy.privacy.allowAccountDeletion,
                  },
                ].map(({ label, value, highlight }) => (
                  <div
                    key={label}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-2.5 gap-0.5"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`text-sm font-medium ${highlight ? 'text-green-700' : 'text-gray-800 dark:text-gray-200'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Report banner */}
            <section className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
              <div className="flex gap-3 items-start">
                <XCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-0.5">Thấy nội dung vi phạm?</p>
                  <p className="text-sm text-emerald-700">
                    Nhấn nút <span className="font-semibold">Báo cáo vi phạm</span> trên bài viết hoặc bình luận.
                    Đội ngũ kiểm duyệt sẽ xử lý trong vòng 24 giờ.
                  </p>
                </div>
              </div>
            </section>

          </div>
        ) : null}
      </div>
    </div>
  );
}
