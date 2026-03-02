import { useState } from 'react';
import { Header } from '../../home/components';
import { SearchSidebar, PeopleResult, GroupResult, PostResult } from '../components';
import { SearchFilterType, SearchResult, SearchResultPerson, SearchResultGroup, SearchResultPost } from '../types/search.types';

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'person',
    name: 'UTE',
    avatar: 'https://images.unsplash.com/photo-1697131997056-287d3b732bf2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwd29tYW4lMjBwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3Njk2NzE1NjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    bio: 'Nhạc sỹ - 100% về xuất, USA, San Antonio, Texas. Thơ kỹ - Luôn mơ mộng - 417K người theo dõi',
    mutualFriends: 12,
    isFollowing: false,
  },
  {
    id: '2',
    type: 'group',
    name: 'UTE - THÁC MÁC HỌC TẬP 🎓 (Trường Đại học Công nghệ Kỹ thuật@TPHCM - HCMUTE)',
    coverImage: 'https://images.unsplash.com/photo-1723474122917-f5d2ea3248c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwY29tbXVuaXR5JTIwZXZlbnR8ZW58MXx8fHwxNzY5NjcxNTYxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    privacy: 'public',
    memberCount: 156000,
    isMember: false,
  },
  {
    id: '3',
    type: 'group',
    name: 'UTE Confessions - Đại Học Sư Phạm Kỹ Thuật TPHCM ( HCMUTE) ✅ ✅',
    coverImage: 'https://images.unsplash.com/photo-1721701233956-ee6d7cd0ee18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm91cCUyMGZyaWVuZHMlMjBvdXRkb29yfGVufDF8fHx8MTc2OTY3MTU2MHww&ixlib=rb-4.1.0&q=80&w=1080',
    privacy: 'public',
    memberCount: 32000,
    isMember: false,
  },
  {
    id: '4',
    type: 'group',
    name: 'UTE Confession',
    coverImage: 'https://images.unsplash.com/photo-1603201667141-5a2d4c673378?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlYW0lMjBtZWV0aW5nfGVufDF8fHx8MTc2OTU5NTcxNXww&ixlib=rb-4.1.0&q=80&w=1080',
    privacy: 'public',
    memberCount: 16000,
    isMember: true,
  },
  {
    id: '5',
    type: 'post',
    author: {
      name: 'Tuổi trẻ Trường ĐH Công nghệ Kỹ thuật TPHCM',
      avatar: 'https://images.unsplash.com/photo-1725473824377-b1a507db7afc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwc3R1ZGVudCUyMGhhcHB5fGVufDF8fHx8MTc2OTY3MTU2Mnww&ixlib=rb-4.1.0&q=80&w=1080',
      type: 'page',
    },
    timestamp: '16 tháng 6, 2023',
    content: '✨UTE-er tấn độ di Youth Festival 2023 thỏi 🤘\n\n#HCMUTE2023',
    image: 'https://images.unsplash.com/photo-1721701233956-ee6d7cd0ee18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm91cCUyMGZyaWVuZHMlMjBvdXRkb29yfGVufDF8fHx8MTc2OTY3MTU2MHww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '6',
    type: 'person',
    name: 'Minh Đức',
    avatar: 'https://images.unsplash.com/photo-1746105625407-5d49d69a2a47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwbWFuJTIwYnVzaW5lc3MlMjBwb3J0cmFpdHxlbnwxfHx8fDE3Njk2NzE1NjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    bio: 'Software Engineer tại UTE | Yêu thích công nghệ và sáng tạo',
    mutualFriends: 5,
    isFollowing: false,
  },
  {
    id: '7',
    type: 'person',
    name: 'Hương Giang',
    avatar: 'https://images.unsplash.com/photo-1725473824377-b1a507db7afc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwc3R1ZGVudCUyMGhhcHB5fGVufDF8fHx8MTc2OTY3MTU2Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    bio: 'Sinh viên UTE K18 | Ngành Công nghệ thông tin',
    mutualFriends: 8,
    isFollowing: true,
  },
];

export default function SearchResultsPage() {
  const [activeFilter, setActiveFilter] = useState<SearchFilterType>('all');
  const [results, setResults] = useState(mockSearchResults);

  const handleFollowToggle = (id: string) => {
    setResults(results.map(result => {
      if (result.id === id && result.type === 'person') {
        return { ...result, isFollowing: !result.isFollowing };
      }
      return result;
    }));
  };

  const handleJoinToggle = (id: string) => {
    setResults(results.map(result => {
      if (result.id === id && result.type === 'group') {
        return { ...result, isMember: !result.isMember };
      }
      return result;
    }));
  };

  // Filter results based on active filter
  const filteredResults = results.filter(result => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'people') return result.type === 'person';
    if (activeFilter === 'groups') return result.type === 'group';
    if (activeFilter === 'posts') return result.type === 'post';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="pt-14 flex">
        {/* Left Sidebar */}
        <SearchSidebar 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter}
        />

        {/* Main Content */}
        <div className="flex-1 p-6 max-w-4xl">
          {/* Results Count */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Tìm thấy {filteredResults.length} kết quả
            </h2>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            {filteredResults.map((result) => {
              if (result.type === 'person') {
                return (
                  <PeopleResult 
                    key={result.id}
                    person={result as SearchResultPerson}
                    onFollowToggle={handleFollowToggle}
                  />
                );
              }
              
              if (result.type === 'group') {
                return (
                  <GroupResult 
                    key={result.id}
                    group={result as SearchResultGroup}
                    onJoinToggle={handleJoinToggle}
                  />
                );
              }
              
              if (result.type === 'post') {
                return (
                  <PostResult 
                    key={result.id}
                    post={result as SearchResultPost}
                  />
                );
              }
              
              return null;
            })}
          </div>

          {/* No Results */}
          {filteredResults.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Không tìm thấy kết quả nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
