import { useState, useMemo } from 'react';
import {
  Bot, ShieldCheck, ShieldAlert, Eye, EyeOff, Zap, AlertTriangle,
  Ban, CheckCircle2, Clock, FileText, MessageSquare, Image,
  TrendingUp, Activity, Save, Loader2, FlaskConical, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import type { PublicPolicyResponse } from '@/types/policy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiConfig {
  enabled: boolean;
  sensitivity: number;
  detect: { toxic: boolean; spam: boolean; nsfw: boolean; hateSpeech: boolean; scam: boolean };
  autoHidePost: boolean;
  autoWarning: boolean;
  autoBan: boolean;
}

interface TestResult {
  overall: number;
  categories: { label: string; score: number; triggered: boolean }[];
  action: string;
  actionColor: string;
}

interface ActivityItem {
  id: number;
  time: string;
  contentType: string;
  score: number;
  action: string;
  actionColor: string;
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAiConfig(policy: PublicPolicyResponse | undefined): AiConfig {
  const raw = (policy?.fullConfig as Record<string, unknown> | undefined)?.aiModeration as Record<string, unknown> | undefined;
  const detect = (raw?.detect ?? {}) as Record<string, unknown>;
  return {
    enabled: Boolean(raw?.enabled ?? true),
    sensitivity: Number(raw?.sensitivity ?? 72),
    detect: {
      toxic: Boolean(detect.toxic ?? true),
      spam: Boolean(detect.spam ?? true),
      nsfw: Boolean(detect.nsfw ?? true),
      hateSpeech: Boolean(detect.hateSpeech ?? true),
      scam: Boolean(detect.scam ?? true),
    },
    autoHidePost: Boolean(raw?.autoHidePost ?? true),
    autoWarning: Boolean(raw?.autoWarning ?? true),
    autoBan: Boolean(raw?.autoBan ?? false),
  };
}

const SENSITIVITY_LABELS = [
  { max: 25, label: 'Relaxed', desc: 'Chỉ bắt vi phạm rõ ràng', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { max: 50, label: 'Balanced', desc: 'Cân bằng chính xác & phủ', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { max: 75, label: 'Strict', desc: 'Bắt nhiều, có thể false positive', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { max: 100, label: 'Very Strict', desc: 'Cực nghiêm, nhiều false positive', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
];

function getSensitivityInfo(v: number) {
  return SENSITIVITY_LABELS.find(l => v <= l.max) ?? SENSITIVITY_LABELS[3];
}

function scoreToAction(score: number, cfg: AiConfig): { label: string; color: string } {
  if (score >= 90 && cfg.autoBan) return { label: 'Auto Ban', color: 'text-red-700' };
  if (score >= 70 && cfg.autoHidePost) return { label: 'Auto Hide', color: 'text-orange-600' };
  if (score >= 50 && cfg.autoWarning) return { label: 'Auto Warning', color: 'text-yellow-600' };
  if (score >= 30) return { label: 'Flag for Review', color: 'text-blue-600' };
  return { label: 'No Action', color: 'text-green-600' };
}

// Simulated AI scoring based on keyword heuristics
const TOXIC_KW = ['chết', 'ngu', 'đần', 'mày', 'tao', 'shit', 'fuck', 'asshole', 'idiot', 'hate', 'kill'];
const SPAM_KW = ['mua ngay', 'click vào', 'free', 'miễn phí', 'http', 'www.', 'bit.ly', 'giảm giá', 'khuyến mãi'];
const NSFW_KW = ['sex', 'nude', 'porn', 'khỏa thân', 'nhạy cảm', 'người lớn', '18+'];
const HATE_KW = ['dân tộc', 'phân biệt', 'kỳ thị', 'racist', 'religion', 'gender', 'miệt thị'];
const SCAM_KW = ['otp', 'mã xác thực', 'chuyển tiền', 'ngân hàng', 'trúng thưởng', 'phishing', 'mật khẩu'];

function scoreText(text: string): TestResult {
  const lower = text.toLowerCase();
  const countHits = (kws: string[]) => kws.filter(k => lower.includes(k)).length;
  const toScore = (hits: number, max: number) => Math.min(100, Math.round((hits / max) * 100 + Math.random() * 8));

  const scores = [
    { label: 'Toxic', score: toScore(countHits(TOXIC_KW), 3), triggered: false },
    { label: 'Spam', score: toScore(countHits(SPAM_KW), 3), triggered: false },
    { label: 'NSFW', score: toScore(countHits(NSFW_KW), 2), triggered: false },
    { label: 'Hate Speech', score: toScore(countHits(HATE_KW), 2), triggered: false },
    { label: 'Scam', score: toScore(countHits(SCAM_KW), 3), triggered: false },
  ].map(c => ({ ...c, triggered: c.score >= 40 }));

  const overall = Math.round(Math.max(...scores.map(c => c.score)) * 0.7 + (scores.reduce((s, c) => s + c.score, 0) / scores.length) * 0.3);
  const { label: action, color: actionColor } = scoreToAction(overall, { enabled: true, sensitivity: 72, detect: { toxic: true, spam: true, nsfw: true, hateSpeech: true, scam: true }, autoHidePost: true, autoWarning: true, autoBan: false });

  return { overall, categories: scores, action, actionColor };
}

// Mock recent activity
const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 1, time: '2 phút trước', contentType: 'Bài viết', score: 87, action: 'Auto Hide', actionColor: 'text-orange-600', content: 'Nội dung chứa ngôn từ xúc phạm...' },
  { id: 2, time: '15 phút trước', contentType: 'Bình luận', score: 62, action: 'Auto Warning', actionColor: 'text-yellow-600', content: 'Có dấu hiệu spam link...' },
  { id: 3, time: '31 phút trước', contentType: 'Bài viết', score: 38, action: 'Flag Review', actionColor: 'text-blue-600', content: 'Có thể chứa thông tin lừa đảo...' },
  { id: 4, time: '1 giờ trước', contentType: 'Ảnh', score: 91, action: 'Auto Hide', actionColor: 'text-orange-600', content: 'Phát hiện nội dung NSFW...' },
  { id: 5, time: '2 giờ trước', contentType: 'Bình luận', score: 18, action: 'No Action', actionColor: 'text-green-600', content: 'Nội dung sạch' },
  { id: 6, time: '3 giờ trước', contentType: 'Bài viết', score: 74, action: 'Auto Hide', actionColor: 'text-orange-600', content: 'Hate speech detected...' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700 leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function scoreBarColor(score: number) {
  if (score >= 70) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-400';
  if (score >= 30) return 'bg-yellow-400';
  return 'bg-green-500';
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface Props { policy: PublicPolicyResponse | undefined }

export function AiModerationDashboard({ policy }: Props) {
  const initial = useMemo(() => extractAiConfig(policy), [policy]);
  const [cfg, setCfg] = useState<AiConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const sensitivityInfo = getSensitivityInfo(cfg.sensitivity);

  const update = <K extends keyof AiConfig>(key: K, val: AiConfig[K]) => {
    setCfg(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const updateDetect = (key: keyof AiConfig['detect'], val: boolean) => {
    setCfg(prev => ({ ...prev, detect: { ...prev.detect, [key]: val } }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/v1/policies/ai-moderation', cfg);
      toast.success('Cấu hình AI Moderation đã được lưu');
      setDirty(false);
    } catch {
      toast.error('Không thể lưu cấu hình. Thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!testInput.trim()) return;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 800));
    setTestResult(scoreText(testInput));
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">

      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">AI Moderation Dashboard</h2>
            <p className="text-xs text-gray-500">Giám sát và kiểm soát nội dung tự động bằng AI</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {cfg.enabled ? 'AI đang hoạt động' : 'AI tạm dừng'}
          </div>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu thay đổi
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={<FileText className="w-5 h-5 text-blue-600" />} label="Posts scanned today" value="1,284" sub="↑ 12% so với hôm qua" color="bg-blue-50" />
        <StatCard icon={<ShieldAlert className="w-5 h-5 text-orange-500" />} label="Flagged content" value="47" sub="3.7% tổng bài quét" color="bg-orange-50" />
        <StatCard icon={<EyeOff className="w-5 h-5 text-red-500" />} label="Auto hidden" value="23" sub="Ẩn tự động hôm nay" color="bg-red-50" />
        <StatCard icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />} label="Auto warnings" value="18" sub="Cảnh báo gửi đi" color="bg-yellow-50" />
        <StatCard icon={<Clock className="w-5 h-5 text-purple-500" />} label="Pending review" value="6" sub="Chờ admin xét duyệt" color="bg-purple-50" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-green-600" />} label="Estimated accuracy" value="94.2%" sub="7 ngày gần nhất" color="bg-green-50" />
      </div>

      {/* ── Settings + Test panel (2 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Cấu hình AI</h3>
          </div>
          <div className="p-5 space-y-5">

            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">AI Enabled</p>
                <p className="text-xs text-gray-500">Bật/tắt toàn bộ hệ thống AI Moderation</p>
              </div>
              <Toggle checked={cfg.enabled} onChange={v => update('enabled', v)} />
            </div>

            {/* Sensitivity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900 text-sm">Sensitivity</p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sensitivityInfo.bg} ${sensitivityInfo.color} ${sensitivityInfo.border}`}>
                  {sensitivityInfo.label} — {cfg.sensitivity}
                </span>
              </div>
              <input
                type="range" min={1} max={100} value={cfg.sensitivity}
                onChange={e => update('sensitivity', Number(e.target.value))}
                disabled={!cfg.enabled}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-600 disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                <span>Relaxed</span><span>Balanced</span><span>Strict</span><span>Very Strict</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{sensitivityInfo.desc}</p>
            </div>

            {/* Detect toggles */}
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-3">Phát hiện</p>
              <div className="space-y-2.5">
                {([
                  { key: 'toxic', label: 'Detect Toxic', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                  { key: 'spam', label: 'Detect Spam', icon: <Zap className="w-3.5 h-3.5" /> },
                  { key: 'nsfw', label: 'Detect NSFW', icon: <Eye className="w-3.5 h-3.5" /> },
                  { key: 'hateSpeech', label: 'Detect Hate Speech', icon: <Ban className="w-3.5 h-3.5" /> },
                  { key: 'scam', label: 'Detect Scam', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
                ] as const).map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-2 text-sm text-gray-700">{icon}{label}</span>
                    <Toggle checked={cfg.detect[key]} onChange={v => updateDetect(key, v)} disabled={!cfg.enabled} />
                  </div>
                ))}
              </div>
            </div>

            {/* Auto actions */}
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-3">Hành động tự động</p>
              <div className="space-y-2.5">
                {([
                  { key: 'autoHidePost' as const, label: 'Auto Hide', desc: 'Ẩn bài khi score ≥ 70%' },
                  { key: 'autoWarning' as const, label: 'Auto Warning', desc: 'Cảnh báo khi score ≥ 50%' },
                  { key: 'autoBan' as const, label: 'Auto Ban', desc: 'Khóa tài khoản khi score ≥ 90%' },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm text-gray-700 font-medium">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <Toggle checked={cfg[key] as boolean} onChange={v => update(key, v)} disabled={!cfg.enabled} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Test Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-gray-900 text-sm">AI Test Panel</h3>
          </div>
          <div className="p-5 space-y-4">
            <textarea
              value={testInput}
              onChange={e => { setTestInput(e.target.value); setTestResult(null); }}
              placeholder="Nhập nội dung cần kiểm tra bằng AI..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 transition-shadow placeholder:text-gray-400"
            />
            <button
              onClick={handleAnalyze}
              disabled={!testInput.trim() || analyzing}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {analyzing ? 'Đang phân tích...' : 'Analyze'}
            </button>

            {testResult && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Overall */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Overall Risk Score</span>
                  <span className={`text-lg font-bold ${scoreBarColor(testResult.overall).replace('bg-', 'text-')}`}>
                    {testResult.overall}%
                  </span>
                </div>
                <ScoreBar score={testResult.overall} color={scoreBarColor(testResult.overall)} />

                {/* Category breakdown */}
                <div className="space-y-2 pt-1">
                  {testResult.categories.map(cat => (
                    <div key={cat.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium flex items-center gap-1 ${cat.triggered ? 'text-red-600' : 'text-gray-500'}`}>
                          {cat.triggered && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
                          {cat.label}
                        </span>
                        <span className="text-xs font-semibold text-gray-700">{cat.score}%</span>
                      </div>
                      <ScoreBar score={cat.score} color={scoreBarColor(cat.score)} />
                    </div>
                  ))}
                </div>

                {/* Predicted action */}
                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">Hành động dự kiến</span>
                  <span className={`font-bold text-sm flex items-center gap-1.5 ${testResult.actionColor}`}>
                    <ChevronRight className="w-4 h-4" />
                    {testResult.action}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Score → Action rules table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Score Range → Action Rules</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Score Range</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Trạng thái</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Mô tả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { range: '0% – 29%', action: 'No Action', color: 'bg-green-100 text-green-700', active: true, desc: 'Nội dung sạch, không cần can thiệp' },
                { range: '30% – 49%', action: 'Flag for Review', color: 'bg-blue-100 text-blue-700', active: true, desc: 'Đánh dấu để admin xét duyệt thủ công' },
                { range: '50% – 69%', action: 'Auto Warning', color: 'bg-yellow-100 text-yellow-700', active: cfg.autoWarning, desc: 'Gửi cảnh báo đến người dùng' },
                { range: '70% – 89%', action: 'Auto Hide', color: 'bg-orange-100 text-orange-700', active: cfg.autoHidePost, desc: 'Ẩn nội dung tự động, chờ review' },
                { range: '90% – 100%', action: 'Auto Ban', color: 'bg-red-100 text-red-700', active: cfg.autoBan, desc: 'Khóa tài khoản vi phạm nghiêm trọng' },
              ].map(row => (
                <tr key={row.range} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-gray-800">{row.range}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.color}`}>{row.action}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${row.active ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${row.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Moderation Activity ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Recent Moderation Activity</h3>
          </div>
          <span className="text-xs text-gray-400">Cập nhật theo thời gian thực</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Thời gian</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Loại</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Nội dung</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">AI Score</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_ACTIVITY.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{item.time}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-xs">
                      {item.contentType === 'Bài viết' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                      {item.contentType === 'Bình luận' && <MessageSquare className="w-3.5 h-3.5 text-green-400" />}
                      {item.contentType === 'Ảnh' && <Image className="w-3.5 h-3.5 text-purple-400" />}
                      <span className="text-gray-600">{item.contentType}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{item.content}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBarColor(item.score)}`} style={{ width: `${item.score}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{item.score}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold ${item.actionColor}`}>{item.action}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
