import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VisibilityOption } from '../types/userSettings.types';

interface VisibilitySelectProps {
  value: VisibilityOption;
  onChange: (value: VisibilityOption) => void;
}

export function VisibilitySelect({ value, onChange }: VisibilitySelectProps) {
  const { t } = useTranslation();

  const options: { value: VisibilityOption; label: string; description: string }[] = [
    { value: 'PUBLIC', label: t('settings.visibility.public'), description: t('settings.visibility.publicDesc') },
    { value: 'FRIENDS', label: t('settings.visibility.friends'), description: t('settings.visibility.friendsDesc') },
    { value: 'PRIVATE', label: t('settings.visibility.private'), description: t('settings.visibility.privateDesc') },
  ];

  return (
    <Select value={value} onValueChange={(v) => onChange(v as VisibilityOption)}>
      <SelectTrigger className="w-full rounded-[10px] border-border bg-card sm:min-w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-[10px]">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
            <span className="font-medium">{opt.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">— {opt.description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
