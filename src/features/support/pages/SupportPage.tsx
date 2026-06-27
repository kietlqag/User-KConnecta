import { useState, type FormEvent } from 'react';

import { ArrowLeft, LifeBuoy, Loader2, Send } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

import { Header } from '../../home/components/Header';

import { authService } from '@/services/authService';

import { supportService, type SupportCategory } from '@/services/supportService';

import { SupportAttachmentPicker } from '../components/SupportAttachmentPicker';

import { SupportRequestList } from '../components/SupportRequestList';

import { useInvalidateSupportRequests, useSupportRequests } from '../hooks/useSupportRequests';



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

  const { data: requests = [], isLoading: requestsLoading } = useSupportRequests();

  const invalidateRequests = useInvalidateSupportRequests();



  const [category, setCategory] = useState<SupportCategory>('FEEDBACK');

  const [subject, setSubject] = useState('');

  const [message, setMessage] = useState('');

  const [attachments, setAttachments] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);



  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !submitting;



  const handleSubmit = async (e: FormEvent) => {

    e.preventDefault();

    if (!canSubmit) return;

    setSubmitting(true);

    try {

      await supportService.sendRequest(

        { category, subject: subject.trim(), message: message.trim() },

        attachments,

      );

      toast.success('Đã gửi yêu cầu hỗ trợ. Chúng tôi sẽ phản hồi sớm nhất có thể.');

      setSubject('');

      setMessage('');

      setAttachments([]);

      setCategory('FEEDBACK');

      void invalidateRequests();

    } catch {

      toast.error('Không thể gửi yêu cầu. Vui lòng thử lại sau.');

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="min-h-screen bg-background">

      <Header />



      <main className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden pt-14">

        <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">

          <button

            onClick={() => navigate(-1)}

            className="mb-4 inline-flex shrink-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"

          >

            <ArrowLeft className="h-4 w-4" />

            Quay lại

          </button>



          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">

            <div className="sidebar-scrollbar min-h-0 overflow-y-auto pr-1">

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

                <div className="flex items-center gap-3 border-b border-border p-5">

                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">

                    <LifeBuoy className="h-6 w-6 text-primary" />

                  </div>

                  <div>

                    <h1 className="text-lg font-bold text-foreground">Trợ giúp và hỗ trợ</h1>

                    <p className="text-sm text-muted-foreground">

                      Gửi câu hỏi, góp ý hoặc báo lỗi — quản trị viên sẽ nhận được yêu cầu của bạn.

                    </p>

                  </div>

                </div>



                <form onSubmit={handleSubmit} className="space-y-5 p-5">

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-foreground">Tên người dùng</label>

                    <input

                      type="text"

                      value={currentUser?.username ? `@${currentUser.username}` : currentUser?.fullName ?? ''}

                      readOnly

                      aria-label="Tên người dùng của bạn"

                      className="w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-muted-foreground"

                    />

                    <p className="mt-1 text-xs text-muted-foreground">

                      Quản trị viên sẽ phản hồi qua thông báo trên ứng dụng.

                    </p>

                  </div>



                  <div>

                    <label htmlFor="support-category" className="mb-1.5 block text-sm font-medium text-foreground">

                      Loại yêu cầu

                    </label>

                    <select

                      id="support-category"

                      value={category}

                      onChange={(e) => setCategory(e.target.value as SupportCategory)}

                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"

                    >

                      {CATEGORIES.map((c) => (

                        <option key={c.value} value={c.value}>

                          {c.label}

                        </option>

                      ))}

                    </select>

                  </div>



                  <div>

                    <label htmlFor="support-subject" className="mb-1.5 block text-sm font-medium text-foreground">

                      Tiêu đề

                    </label>

                    <input

                      id="support-subject"

                      type="text"

                      value={subject}

                      maxLength={SUBJECT_MAX}

                      onChange={(e) => setSubject(e.target.value)}

                      placeholder="Tóm tắt ngắn gọn vấn đề của bạn"

                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"

                    />

                    <p className="mt-1 text-right text-xs text-muted-foreground">

                      {subject.length}/{SUBJECT_MAX}

                    </p>

                  </div>



                  <div>

                    <label htmlFor="support-message" className="mb-1.5 block text-sm font-medium text-foreground">

                      Nội dung

                    </label>

                    <textarea

                      id="support-message"

                      value={message}

                      maxLength={MESSAGE_MAX}

                      onChange={(e) => setMessage(e.target.value)}

                      rows={6}

                      placeholder="Mô tả chi tiết để chúng tôi hỗ trợ bạn tốt hơn..."

                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"

                    />

                    <p className="mt-1 text-right text-xs text-muted-foreground">

                      {message.length}/{MESSAGE_MAX}

                    </p>

                  </div>



                  <SupportAttachmentPicker files={attachments} onChange={setAttachments} />



                  <div className="flex justify-end">

                    <button

                      type="submit"

                      disabled={!canSubmit}

                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"

                    >

                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}

                      {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}

                    </button>

                  </div>

                </form>

              </div>

            </div>



            <div className="min-h-0 h-full lg:flex lg:flex-col">
              <SupportRequestList requests={requests} loading={requestsLoading} />
            </div>

          </div>

        </div>

      </main>

    </div>

  );

};


