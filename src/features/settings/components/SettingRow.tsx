import type { ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  stacked?: boolean;
}

export function SettingRow({ label, description, children, className, stacked }: SettingRowProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] px-4 py-4 transition-colors hover:bg-muted/40',
        stacked ? 'flex flex-col gap-3' : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={cn('shrink-0', stacked ? 'w-full' : 'w-full sm:w-auto sm:min-w-[200px]')}>
        {children}
      </div>
    </div>
  );
}
