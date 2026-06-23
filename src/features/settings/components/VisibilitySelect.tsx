import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VisibilityOption } from '../types/userSettings.types';

const OPTIONS: { value: VisibilityOption; label: string; description: string }[] = [
  { value: 'PUBLIC', label: 'Công khai', description: 'Mọi người trên KConnecta' },
  { value: 'FRIENDS', label: 'Bạn bè', description: 'Chỉ bạn bè của bạn' },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', description: 'Không ai khác xem được' },
];

interface VisibilitySelectProps {
  value: VisibilityOption;
  onChange: (value: VisibilityOption) => void;
}

export function VisibilitySelect({ value, onChange }: VisibilitySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as VisibilityOption)}>
      <SelectTrigger className="w-full rounded-[10px] border-border bg-card sm:min-w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-[10px]">
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
            <span className="font-medium">{opt.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">— {opt.description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
