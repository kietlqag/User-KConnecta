import { formatAllowedFileTypesLabel } from '@/utils/allowedFileTypes';

type PostAllowedFormatsHintProps = {
  allowedFileTypes: string;
  className?: string;
};

export function PostAllowedFormatsHint({ allowedFileTypes, className = '' }: PostAllowedFormatsHintProps) {
  const label = formatAllowedFileTypesLabel(allowedFileTypes);
  if (!label) return null;

  return (
    <p className={`text-xs text-gray-500 dark:text-gray-400 ${className}`.trim()}>
      Định dạng được phép: <span className="font-medium text-gray-600 dark:text-gray-300">{label}</span>
    </p>
  );
}
