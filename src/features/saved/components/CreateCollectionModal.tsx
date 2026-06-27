import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  existingNames?: string[];
}

export function CreateCollectionModal({
  isOpen,
  onClose,
  onSubmit,
  existingNames = [],
}: CreateCollectionModalProps) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setNameError('');
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateName = (value: string): string => {
    if (!value.trim()) return 'Vui lòng nhập tên bộ sưu tập.';
    if (value.length > 50) return 'Tên bộ sưu tập không được vượt quá 50 ký tự.';
    if (existingNames.some((n) => n.toLowerCase() === value.trim().toLowerCase()))
      return 'Tên bộ sưu tập đã tồn tại.';
    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError) setNameError(validateName(value));
  };

  const handleSubmit = async () => {
    if (submittingRef.current || isSubmitting) return;

    const error = validateName(name);
    if (error) {
      setNameError(error);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      toast.success('Tạo bộ sưu tập thành công.');
      onClose();
    } catch {
      toast.error('Không thể tạo bộ sưu tập. Vui lòng thử lại.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Tạo bộ sưu tập mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Tạo bộ sưu tập để sắp xếp các nội dung đã lưu.</p>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Tên bộ sưu tập
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Nhập tên bộ sưu tập"
              maxLength={60}
              className={`w-full px-3 py-2.5 border rounded-lg text-[15px] text-foreground outline-none transition-colors ${ nameError ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' }`}
            />
            <div className="flex items-start justify-between mt-1">
              {nameError ? (
                <p className="text-xs text-red-500">{nameError}</p>
              ) : (
                <span />
              )}
              <p className={`text-xs ml-auto ${name.length > 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {name.length}/50
              </p>
            </div>
          </div>

        </div>

        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-background text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}
