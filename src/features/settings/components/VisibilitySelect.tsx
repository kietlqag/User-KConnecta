import { vi } from '@/constants/vi';
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
  const options: { value: VisibilityOption; label: string; description: string }[] = [
    { value: 'PUBLIC', label: vi.settings.visibility.public, description: vi.settings.visibility.publicDesc },
    { value: 'FRIENDS', label: vi.settings.visibility.friends, description: vi.settings.visibility.friendsDesc },
    { value: 'PRIVATE', label: vi.settings.visibility.private, description: vi.settings.visibility.privateDesc },
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
