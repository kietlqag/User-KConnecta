import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { groupService } from '@/services/groupService';
import { authService } from '@/services/authService';

interface EditGroupDescriptionModalProps {
  groupId: string;
  isOpen: boolean;
  initialDescription: string | null;
  onClose: () => void;
}

export function EditGroupDescriptionModal({
  groupId,
  isOpen,
  initialDescription,
  onClose,
}: EditGroupDescriptionModalProps) {
  const [text, setText] = useState(initialDescription ?? '');
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (isOpen) setText(initialDescription ?? '');
  }, [isOpen, initialDescription]);

  const mutation = useMutation({
    mutationFn: () =>
      groupService.updateDescription(groupId, currentUser!.id, text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'managed'] });
      toast.success('Đã cập nhật mô tả nhóm');
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể cập nhật mô tả');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Mô tả nhóm</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Nhóm dành cho ai? Mục tiêu và quy tắc cơ bản..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[15px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{text.length}/2000</p>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
