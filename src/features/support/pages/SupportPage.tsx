import { useState, type FormEvent } from 'react';
import { ArrowLeft, LifeBuoy, Loader2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Header } from '../../home/components/Header';
import { authService } from '@/services/authService';
import { supportService, type SupportCategory } from '@/services/supportService';

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'BUG', label: 'Báo lỗi' },
  { value: 'FEEDBACK', label: 'Góp ý' },
  { value: 'ACCOUNT', label: 'Vấn đề tài khoản' },
  { value: 'OTHER', label: 'Khác' },
];

const SUBJECT_MAX = 150;
const MESSAGE_MAX = 5000;

export const SupportPage = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [category, setCategory] = useState<SupportCategory>('FEEDBACK');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await supportService.sendRequest({ category, subject: subject.trim(), message: message.trim() });
      toast.success('Đã gửi yêu cầu hỗ trợ. Chúng tôi sẽ phản hồi sớm nhất có thể.');
      setSubject('');
      setMessage('');
      setCategory('FEEDBACK');
    } catch {
      toast.error('Không thể gửi yêu cầu. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-14">
        <div className="max-w-[680px] mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-border">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Trợ giúp và hỗ trợ</h1>
                <p className="text-sm text-muted-foreground">
                  Gửi câu hỏi, góp ý hoặc báo lỗi — quản trị viên sẽ nhận được yêu cầu của bạn.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Email liên hệ (chỉ đọc) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tên người dùng</label>
                <input
                  type="text"
                  value={currentUser?.username ? `@${currentUser.username}` : currentUser?.fullName ?? ''}
                  readOnly
                  aria-label="Tên người dùng của bạn"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Quản trị viên sẽ phản hồi qua thông báo trên ứng dụng.
                </p>
              </div>

              {/* Loại yêu cầu */}
              <div>
                <label htmlFor="support-category" className="block text-sm font-medium text-foreground mb-1.5">
                  Loại yêu cầu
                </label>
                <select
                  id="support-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiêu đề */}
              <div>
                <label htmlFor="support-subject" className="block text-sm font-medium text-foreground mb-1.5">
                  Tiêu đề
                </label>
                <input
                  id="support-subject"
                  type="text"
                  value={subject}
                  maxLength={SUBJECT_MAX}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Tóm tắt ngắn gọn vấn đề của bạn"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="mt-1 text-xs text-muted-foreground text-right">
                  {subject.length}/{SUBJECT_MAX}
                </p>
              </div>

              {/* Nội dung */}
              <div>
                <label htmlFor="support-message" className="block text-sm font-medium text-foreground mb-1.5">
                  Nội dung
                </label>
                <textarea
                  id="support-message"
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Mô tả chi tiết để chúng tôi hỗ trợ bạn tốt hơn..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="mt-1 text-xs text-muted-foreground text-right">
                  {message.length}/{MESSAGE_MAX}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
