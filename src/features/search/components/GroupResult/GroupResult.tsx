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
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover Image */}
      <div className="h-32 w-full overflow-hidden bg-gray-200 cursor-pointer" onClick={goToGroup}>
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
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
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
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : group.isMember
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
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
