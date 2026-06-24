import { useEffect, useState } from 'react';
import { ChevronLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

interface DisplayAccessibilityPanelProps {
  onBack: () => void;
}

const themeOptions = [
  {
    value: 'light',
    label: 'Sáng',
    description: 'Luôn dùng giao diện sáng',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Tối',
    description: 'Luôn dùng giao diện tối',
    icon: Moon,
  },
] as const;

export function DisplayAccessibilityPanel({ onBack }: DisplayAccessibilityPanelProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? (theme === 'dark' ? 'dark' : 'light') : 'light';

  return (
    <div className="p-2">
      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer mb-2"
      >
        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        <span className="font-semibold text-foreground">Màn hình và trợ năng</span>
      </button>

      <div className="px-2 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Chế độ hiển thị
        </p>

        <div className="space-y-1">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeTheme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={!mounted}
                onClick={() => setTheme(option.value)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isActive ? 'bg-accent ring-1 ring-primary/25' : 'hover:bg-muted'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-primary/15' : 'bg-muted'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className={`font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    isActive ? 'border-primary bg-primary' : 'border-border'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
