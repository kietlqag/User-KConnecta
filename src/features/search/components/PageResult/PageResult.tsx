import { CheckCircle, UserPlus, UserCheck } from 'lucide-react';
import { SearchResultPage } from '../../types/search.types';

interface PageResultProps {
  page: SearchResultPage;
  onFollowToggle: (id: string) => void;
}

export const PageResult = ({ page, onFollowToggle }: PageResultProps) => {
  const formatFollowers = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={page.avatar}
            alt={page.name}
            className="w-16 h-16 rounded-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-semibold text-base hover:underline cursor-pointer truncate">
              {page.name}
            </h3>
            {page.isVerified && (
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" fill="#3b82f6" color="white" />
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">{page.category}</p>
          <p className="text-xs text-gray-400">
            {formatFollowers(page.followers)} người theo dõi
          </p>
        </div>

        {/* Follow Button */}
        <button
          onClick={() => onFollowToggle(page.id)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 flex-shrink-0 ${
            page.isFollowing
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {page.isFollowing ? (
            <>
              <UserCheck className="w-4 h-4" />
              Đã theo dõi
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Theo dõi
            </>
          )}
        </button>
      </div>
    </div>
  );
};
