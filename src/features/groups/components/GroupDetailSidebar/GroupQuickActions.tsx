import { Image as ImageIcon, PenTool, UserPlus } from 'lucide-react';

interface GroupQuickActionsProps {
  onInvite: () => void;
  onCreatePost: () => void;
  onCover: () => void;
}

export function GroupQuickActions({ onInvite, onCreatePost, onCover }: GroupQuickActionsProps) {
  const actions = [
    { label: 'Mời', icon: UserPlus, onClick: onInvite },
    { label: 'Đăng bài', icon: PenTool, onClick: onCreatePost },
    { label: 'Ảnh bìa', icon: ImageIcon, onClick: onCover },
  ] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-[15px] text-gray-900 dark:text-gray-100 mb-3">Thao tác nhanh</h3>
      <div className="flex gap-2">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
