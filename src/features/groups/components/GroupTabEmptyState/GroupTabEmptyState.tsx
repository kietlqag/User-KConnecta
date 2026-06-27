import type { LucideIcon } from 'lucide-react';

interface GroupTabEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryHint?: string;
}

export function GroupTabEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryHint,
}: GroupTabEmptyStateProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm dark:shadow-none border border-border p-8 sm:p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
      <p className="text-[15px] text-muted-foreground leading-snug max-w-md mx-auto">{description}</p>
      {secondaryHint && (
        <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto">{secondaryHint}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold text-[15px] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
