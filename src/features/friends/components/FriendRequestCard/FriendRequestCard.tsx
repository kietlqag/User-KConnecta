import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FriendRequest } from '../../types/friends.types';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const FriendRequestCard = ({ request, onAccept, onDelete }: FriendRequestCardProps) => {
  const [loading, setLoading] = useState<'accept' | 'delete' | null>(null);

  const handleAccept = async () => {
    setLoading('accept');
    try { await onAccept(request.id); } finally { setLoading(null); }
  };

  const handleDelete = async () => {
    setLoading('delete');
    try { await onDelete(request.id); } finally { setLoading(null); }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        <Link to={`/profile/${request.userId}`}>
          <img
            src={request.avatar}
            alt={request.name}
            className="w-full h-[280px] object-cover"
          />
        </Link>
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin text-gray-600" /> : <X className="w-4 h-4 text-gray-600" />}
        </button>
      </div>

      <div className="p-4">
        <Link to={`/profile/${request.userId}`}>
          <h3 className="font-semibold text-gray-900 mb-1 hover:underline cursor-pointer">
            {request.name}
          </h3>
        </Link>

        <p className="text-sm text-gray-600 mb-3">
          {request.mutualFriends} bạn chung
        </p>
        <p className="text-xs text-gray-500 mb-3">{request.timestamp}</p>

        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading !== null}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'accept' && <Loader2 className="w-4 h-4 animate-spin" />}
            Xác nhận
          </button>
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'delete' && <Loader2 className="w-4 h-4 animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};
