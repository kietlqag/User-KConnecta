import { Radio } from 'lucide-react';
import { cn } from '@/components/ui/utils';

/** Label + icon aligned with the main header live nav tab. */
export const LIVE_NAV_LABEL = 'Phát trực tuyến';

type LiveFeatureIconProps = {
  className?: string;
  size?: 'sm' | 'md';
};

const sizeClass = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
};

/** Same live icon as the main header nav (`Radio`). */
export function LiveFeatureIcon({ className, size = 'md' }: LiveFeatureIconProps) {
  return <Radio className={cn(sizeClass[size], 'text-primary', className)} />;
}
