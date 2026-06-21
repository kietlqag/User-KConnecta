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
  'flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800 shadow-sm border border-gray-200/80 transition-all hover:bg-gray-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700';

export const reelActionCountClass =
  'text-[11px] font-semibold leading-none text-gray-700 tabular-nums dark:text-gray-300';

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
