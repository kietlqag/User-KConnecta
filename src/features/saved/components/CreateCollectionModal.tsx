import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      setName('');
      setNameError('');
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
    const error = validateName(name);
    if (error) {
      setNameError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      toast.success('Tạo bộ sưu tập thành công.');
      onClose();
    } catch {
      toast.error('Không thể tạo bộ sưu tập. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tạo bộ sưu tập mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-gray-500 dark:text-gray-400"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tạo bộ sưu tập để sắp xếp các nội dung đã lưu.</p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Tên bộ sưu tập
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nhập tên bộ sưu tập"
              maxLength={60}
              className={`w-full px-3 py-2.5 border rounded-lg text-[15px] text-gray-900 dark:text-gray-100 outline-none transition-colors ${
                nameError
                  ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            <div className="flex items-start justify-between mt-1">
              {nameError ? (
                <p className="text-xs text-red-500">{nameError}</p>
              ) : (
                <span />
              )}
              <p className={`text-xs ml-auto ${name.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>
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
            className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}
