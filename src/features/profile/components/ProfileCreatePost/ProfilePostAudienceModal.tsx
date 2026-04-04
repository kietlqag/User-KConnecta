import { useState } from 'react';
import { ArrowLeft, Globe, Users, UserMinus } from 'lucide-react';

interface ProfilePostAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAudience: string;
  onSelect: (audience: string) => void;
}

const audienceOptions = [
  {
    id: 'public',
    icon: Globe,
    title: 'Công khai',
    description: 'Bất kỳ ai ở trên hoặc ngoài Facebook',
  },
  {
    id: 'friends',
    icon: Users,
    title: 'Bạn bè',
    description: 'Bạn bè của bạn trên Facebook',
  },
  {
    id: 'friends-except',
    icon: UserMinus,
    title: 'Bạn bè ngoại trừ...',
    description: 'Bạn bè; Ngoại trừ: Ngô Nhựt Phát',
  },
];

export function ProfilePostAudienceModal({
  isOpen,
  onClose,
  selectedAudience,
  onSelect,
}: ProfilePostAudienceModalProps) {
  const [tempSelected, setTempSelected] = useState(selectedAudience);
  const [setAsDefault, setSetAsDefault] = useState(false);

  if (!isOpen) return null;

  const handleDone = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="sticky top-0 relative flex items-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white">
            Đối tượng của bài viết
          </h2>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Ai có thể xem bài viết của bạn?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bài viết của bạn sẽ hiển thị trên Bảng feed, trang cá nhân và trong kết quả tìm kiếm.
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
                    isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
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

          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Đặt làm đối tượng mặc định</span>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg px-6 py-2 font-semibold text-emerald-600 transition-colors hover:bg-gray-100 dark:text-emerald-400 dark:hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={handleDone}
            className="rounded-lg bg-emerald-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
