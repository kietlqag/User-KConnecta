import { useEffect, useState } from 'react';
import { ArrowLeft, Globe, Users, Lock } from 'lucide-react';
import { type AudienceId, getAudienceDescription } from './postAudienceUtils';

interface ProfilePostAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAudience: AudienceId;
  onSelect: (audience: AudienceId) => void;
}

const audienceOptions: {
  id: AudienceId;
  icon: typeof Globe;
  title: string;
  description: string;
}[] = [
  {
    id: 'public',
    icon: Globe,
    title: 'Công khai',
    description: 'Bất kỳ ai đều có thể xem bài viết này',
  },
  {
    id: 'friends',
    icon: Users,
    title: 'Bạn bè',
    description: 'Chỉ bạn bè của bạn mới có thể xem',
  },
  {
    id: 'private',
    icon: Lock,
    title: 'Chỉ mình tôi',
    description: 'Chỉ bạn mới có thể xem bài viết này',
  },
];

export function ProfilePostAudienceModal({
  isOpen,
  onClose,
  selectedAudience,
  onSelect,
}: ProfilePostAudienceModalProps) {
  const [tempSelected, setTempSelected] = useState<AudienceId>(selectedAudience);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedAudience);
    }
  }, [isOpen, selectedAudience]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="relative flex shrink-0 items-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white">
            Đối tượng của bài viết
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Ai có thể xem bài viết của bạn?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getAudienceDescription(tempSelected)}
            </p>
          </div>

          <div className="space-y-2">
            {audienceOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = tempSelected === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setTempSelected(option.id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${
                    isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isSelected ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{option.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-emerald-600 dark:border-emerald-400' : 'border-gray-400 dark:border-gray-500'
                    }`}
                  >
                    {isSelected && <div className="h-3 w-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg px-6 py-2 font-semibold text-emerald-600 transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:text-emerald-400 dark:hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              onSelect(tempSelected);
              onClose();
            }}
            className="rounded-lg bg-emerald-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
