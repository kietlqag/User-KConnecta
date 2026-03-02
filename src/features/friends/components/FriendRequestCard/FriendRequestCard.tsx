import { X } from 'lucide-react';
import { FriendRequest } from '../../types/friends.types';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onDelete: (id: string) => void;
}

export const FriendRequestCard = ({ request, onAccept, onDelete }: FriendRequestCardProps) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        <img
          src={request.avatar}
          alt={request.name}
          className="w-full h-[280px] object-cover"
        />
        <button
          onClick={() => onDelete(request.id)}
          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 hover:underline cursor-pointer">
          {request.name}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {request.mutualFriends} bạn chung
        </p>
        <p className="text-xs text-gray-500 mb-3">{request.timestamp}</p>
        
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(request.id)}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Xác nhận
          </button>
          <button
            onClick={() => onDelete(request.id)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};
