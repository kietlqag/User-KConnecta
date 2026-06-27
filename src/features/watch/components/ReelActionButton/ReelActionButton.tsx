import type { ReactNode } from 'react';

interface ReelActionButtonProps {
  label?: string;
  count?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

export const reelActionIconClass =
  'flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-muted text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';

export const reelActionCountClass =
  'text-[11px] font-semibold leading-none text-foreground tabular-nums';

export function ReelActionButton({
  label,
  count,
  onClick,
  disabled = false,
  ariaLabel,
  children,
  className = '',
}: ReelActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex flex-col items-center gap-1.5 outline-none ${className}`}
    >
      <div className={reelActionIconClass}>{children}</div>
      {(count != null || label) && (
        <span className={reelActionCountClass}>{count ?? label}</span>
      )}
    </button>
  );
}
