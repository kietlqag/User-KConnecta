export function formatLastActiveLabel(isOnline: boolean, lastActiveAt?: string) {
  if (isOnline) return 'Đang hoạt động';

  if (!lastActiveAt) return 'Truy cập gần đây';

  const date = new Date(lastActiveAt);
  if (Number.isNaN(date.getTime())) return 'Truy cập gần đây';

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    const safeHours = Math.max(1, diffHours);
    return `Truy cập ${safeHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 31) {
    return `Truy cập ${diffDays} ngày trước`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `Truy cập ${diffMonths} tháng trước`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `Truy cập ${diffYears} năm trước`;
}

