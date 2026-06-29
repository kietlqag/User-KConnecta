import { Link2, Megaphone } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type LiveSidebarInfoVariant = 'notice' | 'link';

const VARIANT_CONFIG: Record<LiveSidebarInfoVariant, {
  label: string;
  icon: typeof Megaphone;
  container: string;
  header: string;
  body: string;
  action: string;
}> = {
  notice: {
    label: 'Thông báo',
    icon: Megaphone,
    container: 'border-amber-200 bg-amber-50',
    header: 'text-amber-700',
    body: 'text-amber-950',
    action: 'text-amber-700 hover:text-amber-900',
  },
  link: {
    label: 'Liên kết',
    icon: Link2,
    container: 'border-emerald-200 bg-emerald-50',
    header: 'text-emerald-700',
    body: 'text-emerald-800',
    action: 'text-emerald-700 hover:text-emerald-900',
  },
};

interface LiveSidebarInfoCardProps {
  variant: LiveSidebarInfoVariant;
  /** Nội dung 1 dòng (tự clamp + xem thêm). Dùng children để bọc link <a> nếu cần. */
  children: ReactNode;
}

export function LiveSidebarInfoCard({ variant, children }: LiveSidebarInfoCardProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    // Ở trạng thái clamp, scrollHeight > clientHeight nghĩa là nội dung tràn quá 1 dòng.
    setIsOverflowing(el.scrollHeight - el.clientHeight > 1);
  }, [children, expanded]);

  return (
    <div className={`rounded-xl border p-3 ${config.container}`}>
      <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${config.header}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </div>
      <div
        ref={bodyRef}
        className={`break-words text-sm font-medium ${config.body} ${expanded ? '' : 'line-clamp-1'}`}
      >
        {children}
      </div>
      {(isOverflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={`mt-1 text-xs font-semibold ${config.action}`}
        >
          {expanded ? 'Ẩn bớt' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
