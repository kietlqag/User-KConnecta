import { ReactNode } from 'react';

type LiveOptionTone = 'emerald' | 'violet';

interface LiveOptionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  tone?: LiveOptionTone;
  onClick: () => void;
}

const toneStyles: Record<LiveOptionTone, { iconWrap: string; button: string }> = {
  emerald: {
    iconWrap: 'bg-emerald-100 dark:bg-emerald-900/30',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  violet: {
    iconWrap: 'bg-violet-100 dark:bg-violet-900/30',
    button: 'bg-violet-600 text-white hover:bg-violet-700',
  },
};

export const LiveOptionCard = ({
  icon,
  title,
  description,
  buttonText,
  tone = 'emerald',
  onClick,
}: LiveOptionCardProps) => {
  const styles = toneStyles[tone];

  return (
    <div className="flex flex-col items-center rounded-lg bg-card p-8 text-center shadow-md transition-shadow hover:shadow-lg">
      <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${styles.iconWrap}`}>
        {icon}
      </div>

      <h3 className="mb-3 text-xl font-semibold">{title}</h3>

      <p className="mb-6 text-sm text-muted-foreground">{description}</p>

      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-lg px-6 py-3 font-semibold transition-colors ${styles.button}`}
      >
        {buttonText}
      </button>
    </div>
  );
};
