import React from 'react';
import { useGroupJoinRequests, useApproveJoinRequest, useRejectJoinRequest } from '../../hooks/useGroups';
import { UserCheck, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupRequestsTabProps {
  groupId: string;
  onApproveSuccess?: () => void;
}

export function GroupRequestsTab({ groupId, onApproveSuccess }: GroupRequestsTabProps) {
  const { data: requests = [], isLoading, error } = useGroupJoinRequests(groupId);
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();

  const handleApprove = (userId: string, fullName: string) => {
    approveMutation.mutate(
      { groupId, userId },
      {
        onSuccess: () => {
          toast.success(`Đã phê duyệt ${fullName} vào nhóm!`);
          if (onApproveSuccess) onApproveSuccess();
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Không thể phê duyệt yêu cầu.');
        },
      }
    );
  };

  const handleReject = (userId: string, fullName: string) => {
    rejectMutation.mutate(
      { groupId, userId },
      {
        onSuccess: () => {
          toast.success(`Đã từ chối yêu cầu của ${fullName}`);
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Không thể từ chối yêu cầu.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Đang tải danh sách yêu cầu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 text-sm font-medium">
        Không thể tải danh sách yêu cầu: {error.message}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
          <UserCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Không có yêu cầu tham gia nào</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm leading-relaxed">
          Khi có thành viên mới gửi yêu cầu tham gia nhóm này, các yêu cầu chờ duyệt sẽ được hiển thị tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-[17px] flex items-center gap-2">
          Yêu cầu tham gia
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {requests.length}
          </span>
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {requests.map((req) => {
          const initials = req.fullName
            ? req.fullName.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            : '?';

          return (
            <div key={req.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {req.avatarUrl ? (
                  <img
                    src={req.avatarUrl}
                    alt={req.fullName}
                    className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-gray-800 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-[15px] truncate hover:underline cursor-pointer">
                    {req.fullName}
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Yêu cầu tham gia nhóm</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleReject(req.userId, req.fullName)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Từ chối</span>
                </button>
                <button
                  onClick={() => handleApprove(req.userId, req.fullName)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1 transition-all active:scale-[0.98] shadow-sm dark:shadow-none hover:shadow disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Phê duyệt</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
