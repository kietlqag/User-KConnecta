import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="border-b border-border pb-8 last:border-b-0 last:pb-0">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
