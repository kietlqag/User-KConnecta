import { Lock, Globe, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchResultGroup } from '../../types/search.types';

interface GroupResultProps {
  group: SearchResultGroup;
  onJoinToggle: (id: string) => void;
}

export const GroupResult = ({ group, onJoinToggle }: GroupResultProps) => {
  const navigate = useNavigate();
  const goToGroup = () => navigate(`/groups/${group.id}`);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover Image */}
      <div className="h-32 w-full overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer" onClick={goToGroup}>
        <img
          src={group.coverImage}
          alt={group.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-semibold text-base mb-2 hover:underline cursor-pointer"
          onClick={goToGroup}
        >
          {group.name}
        </h3>

        {/* Privacy and Member Count */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          {group.privacy === 'public' ? (
            <Globe className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          <span className="capitalize">{group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
          <span>•</span>
          <span>{group.memberCount.toLocaleString()} thành viên</span>
        </div>

        {/* Join Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onJoinToggle(group.id); }}
          disabled={group.isPending}
          className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            group.isPending
              ? 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : group.isMember
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {group.isPending ? (
            'Đang chờ duyệt...'
          ) : group.isMember ? (
            <>
              <Check className="w-4 h-4" />
              Đã tham gia
            </>
          ) : (
            'Tham gia nhóm'
          )}
        </button>
      </div>
    </div>
  );
};
