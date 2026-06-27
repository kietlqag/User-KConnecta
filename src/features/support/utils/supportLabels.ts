import type { SupportCategory, SupportStatus } from '@/services/supportService';

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  BUG: 'Báo lỗi',
  FEEDBACK: 'Góp ý',
  ACCOUNT: 'Vấn đề tài khoản',
  OTHER: 'Khác',
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
};

export const SUPPORT_STATUS_STYLES: Record<SupportStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  IN_PROGRESS: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export const SUPPORT_PROGRESS_STEPS: { status: SupportStatus; label: string }[] = [
  { status: 'PENDING', label: 'Chờ xử lý' },
  { status: 'IN_PROGRESS', label: 'Đang xử lý' },
  { status: 'RESOLVED', label: 'Đã giải quyết' },
];

export function getSupportStatusIndex(status: SupportStatus) {
  return SUPPORT_PROGRESS_STEPS.findIndex((step) => step.status === status);
}

export function formatSupportDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
