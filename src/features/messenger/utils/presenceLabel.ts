export function formatLastActiveLabel(isOnline: boolean, lastActiveAt?: string) {
  if (isOnline) return 'Đang hoạt động';
  if (!lastActiveAt) return '';

  const date = new Date(lastActiveAt);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Truy cập vừa xong';
  if (diffMinutes < 60) return `Truy cập ${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) {
    const safeHours = Math.max(1, diffHours);
    return `Truy cập ${safeHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 31) return `Truy cập ${diffDays} ngày trước`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `Truy cập ${diffMonths} tháng trước`;

  const diffYears = Math.floor(diffMonths / 12);
  return `Truy cập ${diffYears} năm trước`;
}
