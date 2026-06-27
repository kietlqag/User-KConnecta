import { formatAllowedFileTypesLabel } from '@/utils/allowedFileTypes';

type PostAllowedFormatsHintProps = {
  allowedFileTypes: string;
  className?: string;
};

export function PostAllowedFormatsHint({ allowedFileTypes, className = '' }: PostAllowedFormatsHintProps) {
  const label = formatAllowedFileTypesLabel(allowedFileTypes);
  if (!label) return null;

  return (
    <p className={`text-xs text-muted-foreground ${className}`.trim()}>
      Định dạng được phép: <span className="font-medium text-muted-foreground">{label}</span>
    </p>
  );
}
