import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface SupportAttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function SupportAttachmentPicker({ files, onChange }: SupportAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleSelect = (incoming: FileList | null) => {
    if (!incoming?.length) return;

    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (!file.type.startsWith('image/')) {
        toast.error('Chỉ chấp nhận file ảnh');
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error('Mỗi ảnh tối đa 5MB');
        continue;
      }
      if (next.length >= MAX_FILES) {
        toast.error(`Tối đa ${MAX_FILES} ảnh minh chứng`);
        break;
      }
      next.push(file);
    }

    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Ảnh minh chứng (tuỳ chọn)</label>
        <span className="text-xs text-muted-foreground">{files.length}/{MAX_FILES}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple
        className="hidden"
        onChange={(e) => handleSelect(e.target.files)}
      />

      {files.length > 0 ? (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img
                src={previews[index]}
                alt={file.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Xóa ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={files.length >= MAX_FILES}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImagePlus className="h-4 w-4" />
        Thêm ảnh minh chứng
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        JPG, PNG, WEBP — tối đa 5 ảnh, mỗi ảnh 5MB.
      </p>
    </div>
  );
}
