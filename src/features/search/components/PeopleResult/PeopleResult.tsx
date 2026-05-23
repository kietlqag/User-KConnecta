import { UserPlus, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchResultPerson } from '../../types/search.types';

interface PeopleResultProps {
  person: SearchResultPerson;
  onFollowToggle: (id: string) => void;
}

export const PeopleResult = ({ person, onFollowToggle }: PeopleResultProps) => {
  const navigate = useNavigate();
  const goToProfile = () => navigate(`/profile/${person.id}`);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <img
          src={person.avatar}
          alt={person.name}
          onClick={goToProfile}
          className="w-20 h-20 rounded-full object-cover flex-shrink-0 cursor-pointer"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-base mb-1 hover:underline cursor-pointer"
            onClick={goToProfile}
          >
            {person.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {person.bio}
          </p>
          {person.mutualFriends && person.mutualFriends > 0 && (
            <p className="text-xs text-gray-500">
              {person.mutualFriends} bạn chung
            </p>
          )}
        </div>

        {/* Follow Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onFollowToggle(person.id); }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 flex-shrink-0 cursor-pointer ${
            person.isFollowing
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {person.isFollowing ? (
            <>
              <UserCheck className="w-4 h-4" />
              Đang theo dõi
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
