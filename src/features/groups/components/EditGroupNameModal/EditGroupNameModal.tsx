import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { groupService } from '@/services/groupService';
import { authService } from '@/services/authService';

interface EditGroupNameModalProps {
  groupId: string;
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
}

export function EditGroupNameModal({
  groupId,
  isOpen,
  initialName,
  onClose,
}: EditGroupNameModalProps) {
  const [name, setName] = useState(initialName);
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (isOpen) setName(initialName);
  }, [isOpen, initialName]);

  const mutation = useMutation({
    mutationFn: () =>
      groupService.updateName(groupId, currentUser!.id, name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'joined'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'managed'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'discover'] });
      toast.success('Đã cập nhật tên nhóm');
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể cập nhật tên nhóm');
    },
  });

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialName.trim();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Đổi tên nhóm</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            placeholder="Tên nhóm"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-[15px] text-foreground outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{name.length}/150</p>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 rounded-lg bg-background text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSave}
            className="flex-1 py-2.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
