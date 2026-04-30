import React, { useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { useFriends } from '@/features/friends/hooks/useFriends';
import { authService } from '@/services/authService';
import { useInviteFriends } from '@/features/groups/hooks/useGroups';
import { toast } from 'sonner';

interface InviteFriendsModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  existingMemberIds: string[];
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  groupId,
  isOpen,
  onClose,
  existingMemberIds,
}) => {
  const currentUser = authService.getCurrentUser();
  const { data: friends = [], isLoading } = useFriends(currentUser?.id);
  const inviteMutation = useInviteFriends();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  if (!isOpen) return null;

  // Filter friends based on search term and exclude already members
  const filteredFriends = friends.filter(friend => {
    const isAlreadyMember = existingMemberIds.includes(friend.userId);
    const matchesSearch = friend.name.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadyMember && matchesSearch;
  });

  const selectedFriends = friends.filter(f => selectedUserIds.includes(f.userId));

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleInvite = () => {
    if (selectedUserIds.length === 0) return;
    
    inviteMutation.mutate({ groupId, userIds: selectedUserIds }, {
      onSuccess: () => {
        toast.success(`Đã gửi lời mời đến ${selectedUserIds.length} người bạn`);
        onClose();
        setSelectedUserIds([]);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi gửi lời mời');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-[680px] rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[540px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="w-8" /> {/* Spacer */}
          <h2 className="text-[20px] font-bold text-gray-900">Mời bạn bè tham gia nhóm này</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Side: Friend List & Search */}
          <div className="w-[60%] flex flex-col border-r border-gray-100">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm bạn bè theo tên"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
              <div className="px-3 mb-2">
                <span className="text-[15px] font-semibold text-gray-900">Gợi ý</span>
              </div>
              
              {isLoading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Đang tải bạn bè...</div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">Không tìm thấy bạn bè nào</div>
              ) : (
                <div className="space-y-1">
                  {filteredFriends.map((friend) => (
                    <div 
                      key={friend.userId}
                      onClick={() => toggleUserSelection(friend.userId)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
                    >
                      <img 
                        src={friend.avatar} 
                        alt={friend.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <span className="flex-1 text-[15px] font-medium text-gray-900">{friend.name}</span>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        selectedUserIds.includes(friend.userId)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {selectedUserIds.includes(friend.userId) && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Selection Summary */}
          <div className="w-[40%] bg-gray-50/50 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-100 bg-white">
              <span className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider">
                Đã chọn {selectedUserIds.length} người bạn
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedFriends.map((friend) => (
                <div key={friend.userId} className="flex items-center gap-3">
                  <img 
                    src={friend.avatar} 
                    alt={friend.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="flex-1 text-[14px] font-medium text-gray-900 truncate">{friend.name}</span>
                  <button 
                    onClick={() => toggleUserSelection(friend.userId)}
                    className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {selectedUserIds.length === 0 && (
                <div className="h-full flex items-center justify-center text-center p-4">
                  <p className="text-sm text-gray-400">Chưa có bạn bè nào được chọn</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors text-[15px]"
          >
            Hủy
          </button>
          <button 
            disabled={selectedUserIds.length === 0 || inviteMutation.isPending}
            onClick={handleInvite}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold transition-all text-[15px] shadow-sm flex items-center gap-2"
          >
            {inviteMutation.isPending && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Gửi lời mời
          </button>
        </div>
      </div>
    </div>
  );
};
