import { X, Clock, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router@7.1.3';
import { RecentSearchItem } from '../../types/search.types';

interface SearchSuggestionsProps {
  query: string;
  onClose: () => void;
}

const mockRecentSearches: RecentSearchItem[] = [
  {
    id: '1',
    type: 'keyword',
    text: 'ute',
  },
  {
    id: '2',
    type: 'page',
    text: 'Điểm thi cải Điểm Kèm Luyện',
    avatar: 'https://images.unsplash.com/photo-1697131997056-287d3b732bf2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwd29tYW4lMjBwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3Njk2NzE1NjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '3',
    type: 'person',
    text: 'Khang Nguyen',
    avatar: 'https://images.unsplash.com/photo-1746105625407-5d49d69a2a47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwbWFuJTIwYnVzaW5lc3MlMjBwb3J0cmFpdHxlbnwxfHx8fDE3Njk2NzE1NjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '4',
    type: 'group',
    text: 'TFT INFO',
    avatar: 'https://images.unsplash.com/photo-1723474122917-f5d2ea3248c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwY29tbXVuaXR5JTIwZXZlbnR8ZW58MXx8fHwxNzY5NjcxNTYxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    badge: '5+ thông tin mới',
  },
  {
    id: '5',
    type: 'page',
    text: 'Bnit',
    avatar: 'https://images.unsplash.com/photo-1603201667141-5a2d4c673378?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlYW0lMjBtZWV0aW5nfGVufDF8fHx8MTc2OTU5NTcxNXww&ixlib=rb-4.1.0&q=80&w=1080',
    badge: '5+ thông tin mới',
  },
  {
    id: '6',
    type: 'keyword',
    text: 'tri',
  },
];

export const SearchSuggestions = ({ query, onClose }: SearchSuggestionsProps) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Suggestions Panel */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl z-50 max-h-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-base">Tìm kiếm gần đây</h3>
          <button className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium transition-colors">
            Chỉnh sửa
          </button>
        </div>

        {/* Recent Searches List */}
        <div className="overflow-y-auto max-h-[400px]">
          {mockRecentSearches.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.type === 'keyword') {
                  navigate(`/search?q=${item.text}`);
                } else if (item.type === 'page') {
                  navigate(`/page/${item.text}`);
                } else if (item.type === 'person') {
                  navigate(`/person/${item.text}`);
                } else if (item.type === 'group') {
                  navigate(`/group/${item.text}`);
                }
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors group"
            >
              {/* Avatar or Icon */}
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.text}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>
              )}

              {/* Text */}
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm">{item.text}</div>
                {item.badge && (
                  <div className="text-xs text-gray-500">{item.badge}</div>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // onRemoveItem(item.id);
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};