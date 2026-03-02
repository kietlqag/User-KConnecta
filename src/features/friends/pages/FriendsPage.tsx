import { useState } from 'react';
import { FriendsLeftSidebar, FriendCard, FriendRequestCard } from '../components';
import { Friend, FriendRequest } from '../types/friends.types';
import { MainLayout } from '../../../layouts';

const mockFriendRequests: FriendRequest[] = [
  {
    id: '1',
    name: 'Nguyễn Quốc Toàn',
    avatar: 'https://images.unsplash.com/photo-1695800998493-ccff5ea292ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHByb2Zlc3Npb25hbCUyMEFzaWFuJTIweW91bmclMjBtYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 5,
    timestamp: '1 tuần',
  },
  {
    id: '2',
    name: 'Trần Minh Anh',
    avatar: 'https://images.unsplash.com/photo-1758600587839-56ba05596c69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHByb2Zlc3Npb25hbCUyMEFzaWFuJTIweW91bmclMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNjl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 12,
    timestamp: '2 tuần',
  },
  {
    id: '3',
    name: 'Lê Văn Hùng',
    avatar: 'https://images.unsplash.com/photo-1717985498747-f081679d2c33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGNhc3VhbCUyMFZpZXRuYW1lc2UlMjBtYW58ZW58MXx8fHwxNzY5NjY2MzcwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 8,
    timestamp: '3 ngày',
  },
  {
    id: '4',
    name: 'Phạm Thu Hà',
    avatar: 'https://images.unsplash.com/photo-1718307701476-bf46ac964396?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGNhc3VhbCUyMFZpZXRuYW1lc2UlMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 15,
    timestamp: '5 ngày',
  },
];

const mockSuggestions: Friend[] = [
  {
    id: '5',
    name: 'Nguyễn Thị Mai',
    avatar: 'https://images.unsplash.com/photo-1581065178047-8ee15951ede6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGJ1c2luZXNzJTIwQXNpYW4lMjB3b21hbnxlbnwxfHx8fDE3Njk2NjYzNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 20,
    isFriend: false,
  },
  {
    id: '6',
    name: 'Hoàng Đức Thắng',
    avatar: 'https://images.unsplash.com/photo-1738566061505-556830f8b8f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMGJ1c2luZXNzJTIwQXNpYW4lMjBtYW58ZW58MXx8fHwxNzY5NjY2MzcxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 18,
    isFriend: false,
  },
  {
    id: '7',
    name: 'Vũ Thị Lan',
    avatar: 'https://images.unsplash.com/photo-1725473823290-8a261fe706a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHN0dWRlbnQlMjBBc2lhbiUyMHdvbWFufGVufDF8fHx8MTc2OTY2NjM3MXww&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 10,
    isFriend: false,
  },
  {
    id: '8',
    name: 'Đặng Minh Tuấn',
    avatar: 'https://images.unsplash.com/photo-1609126396762-542d99fc7a07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHN0dWRlbnQlMjBBc2lhbiUyMG1hbnxlbnwxfHx8fDE3Njk2NjYzNzF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    mutualFriends: 14,
    isFriend: false,
  },
];

export const FriendsPage = () => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(mockFriendRequests);
  const [suggestions, setSuggestions] = useState<Friend[]>(mockSuggestions);

  const handleAcceptRequest = (id: string) => {
    console.log('Accept friend request:', id);
    setFriendRequests(prev => prev.filter(req => req.id !== id));
  };

  const handleDeleteRequest = (id: string) => {
    console.log('Delete friend request:', id);
    setFriendRequests(prev => prev.filter(req => req.id !== id));
  };

  const handleAddFriend = (id: string) => {
    console.log('Add friend:', id);
    setSuggestions(prev => prev.filter(sug => sug.id !== id));
  };

  const handleRemoveSuggestion = (id: string) => {
    console.log('Remove suggestion:', id);
    setSuggestions(prev => prev.filter(sug => sug.id !== id));
  };

  return (
    <MainLayout>
      <div className="max-w-[1920px] mx-auto">
        <div className="flex">
          <FriendsLeftSidebar />
          
          <main className="flex-1 p-8 max-w-[920px]">
            {/* Friend Requests Section */}
            {friendRequests.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Lời mời kết bạn
                    <span className="ml-2 text-gray-500 font-normal">
                      {friendRequests.length}
                    </span>
                  </h2>
                  <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Xem tất cả
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {friendRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      onAccept={handleAcceptRequest}
                      onDelete={handleDeleteRequest}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* People You May Know Section */}
            {suggestions.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Những người bạn có thể biết
                  </h2>
                  <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Xem tất cả
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {suggestions.map((friend) => (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      onAddFriend={handleAddFriend}
                      onRemoveSuggestion={handleRemoveSuggestion}
                      showRemove
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {friendRequests.length === 0 && suggestions.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Không có lời mời kết bạn mới
                </h3>
                <p className="text-gray-600">
                  Hãy khám phá và kết nối với những người bạn có thể biết
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </MainLayout>
  );
};