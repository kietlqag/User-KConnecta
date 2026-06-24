import type { LucideIcon } from 'lucide-react';
import { AlignLeft, FileType, Gauge, Images, Loader2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublicPolicies } from '@/hooks/usePublicPolicies';
import type { PublicPostPolicy } from '@/types/policy';
import { InfoPageShell } from '../components/InfoPageShell';
import {
  DEFAULT_POST_POLICY,
  formatAllowedFileTypes,
  formatPolicyUpdatedAt,
} from '../constants/postPolicyDefaults';

type RuleItem = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
};

const buildRules = (policy: PublicPostPolicy): RuleItem[] => [
  {
    icon: AlignLeft,
    label: 'Độ dài bài viết',
    value: `Tối đa ${policy.maxPostLength.toLocaleString('vi-VN')} ký tự`,
    hint: 'Bao gồm chữ, số, emoji và khoảng trắng trong nội dung bài.',
  },
  {
    icon: Images,
    label: 'Ảnh & video đính kèm',
    value: `Tối đa ${policy.maxImagesPerPost} tệp / bài`,
    hint: 'Mỗi bài có thể gồm ảnh hoặc video, trong giới hạn số lượng trên.',
  },
  {
    icon: Video,
    label: 'Dung lượng video',
    value: `Tối đa ${policy.maxVideoMb} MB / video`,
    hint: 'Video vượt dung lượng sẽ không được tải lên.',
  },
  {
    icon: FileType,
    label: 'Định dạng file',
    value: formatAllowedFileTypes(policy.allowedFileTypes),
    hint: 'Chỉ các đuôi file được liệt kê mới được phép đính kèm.',
  },
  {
    icon: Gauge,
    label: 'Tần suất đăng bài',
    value: `Tối đa ${policy.postsPerMinute} bài / phút`,
    hint: 'Giới hạn chống spam; vượt mức có thể bị từ chối tạm thời.',
  },
];

function PolicyRuleCard({ icon: Icon, label, value, hint }: RuleItem) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</h2>
      <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{hint}</p>
    </article>
  );
}

export default function PostPolicyPage() {
  const { data, isLoading, isError } = usePublicPolicies();
  const postPolicy = data?.postPolicy ?? DEFAULT_POST_POLICY;
  const rules = buildRules(postPolicy);
  const updatedAt = formatPolicyUpdatedAt(data?.updatedAt);
  const usingDefaults = isError || !data;

  return (
    <InfoPageShell
      title="Quy định đăng bài"
      subtitle="Giới hạn kỹ thuật khi bạn tạo hoặc chỉnh sửa bài viết trên KConnecta"
      updatedAt={updatedAt}
      icon={AlignLeft}
    >
      <div className="mt-8 space-y-6">
        <p className="max-w-3xl text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Các quy định dưới đây được áp dụng khi bạn đăng bài trên trang cá nhân, bảng tin hoặc
          nhóm. Hệ thống kiểm tra tự động trước khi đăng; nếu vi phạm, bài viết sẽ không được
          xuất bản và bạn sẽ nhận thông báo lỗi cụ thể.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải quy định…
          </div>
        ) : (
          <>
            {usingDefaults ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                Không tải được cấu hình mới nhất từ máy chủ — đang hiển thị quy định mặc định.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {rules.map((rule) => (
                <PolicyRuleCard key={rule.label} {...rule} />
              ))}
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900/60">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Nội dung không được phép
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Ngoài giới hạn kỹ thuật, bài viết còn phải tuân thủ{' '}
                <Link
                  to="/terms"
                  className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Điều khoản dịch vụ
                </Link>{' '}
                và quy tắc cộng đồng (spam, ngôn từ thù ghét, nội dung 18+, lừa đảo…). Từ khóa
                nhạy cảm có thể bị chặn ngay khi bạn soạn thảo.
              </p>
            </section>
          </>
        )}
      </div>
    </InfoPageShell>
  );
}
