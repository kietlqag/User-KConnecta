import { useState } from 'react';
import { ChevronRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostPollResponse } from '@/services/postService';

interface PostPollCardProps {
  postId: string;
  poll: PostPollResponse;
  canManageOptions?: boolean;
  onPollChange?: (poll: PostPollResponse) => void;
}

export function PostPollCard({
  postId,
  poll: initialPoll,
  canManageOptions = false,
  onPollChange,
}: PostPollCardProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [isVoting, setIsVoting] = useState(false);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [deletingOptionId, setDeletingOptionId] = useState<string | null>(null);

  const hasVoted = poll.myVotedOptionIds.length > 0;
  const showResults = hasVoted || poll.totalVotes > 0;

  const updatePoll = (next: PostPollResponse) => {
    setPoll(next);
    onPollChange?.(next);
  };

  const handleVote = async (optionId: string) => {
    const user = authService.getCurrentUser();
    if (!user) {
      toast.error('Bạn cần đăng nhập để bình chọn');
      return;
    }
    setIsVoting(true);
    try {
      const updated = await postService.votePoll(postId, { optionId });
      updatePoll(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể bình chọn');
    } finally {
      setIsVoting(false);
    }
  };

  const handleAddOption = async () => {
    const text = newOptionText.trim();
    if (!text) return;
    setIsAddingOption(true);
    try {
      const updated = await postService.addPollOption(postId, { text });
      updatePoll(updated);
      setNewOptionText('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm lựa chọn');
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    setDeletingOptionId(optionId);
    try {
      const updated = await postService.deletePollOption(postId, optionId);
      updatePoll(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa lựa chọn');
    } finally {
      setDeletingOptionId(null);
    }
  };

  return (
    <div className="mb-3 space-y-2">
      {poll.options.map((option) => {
        const isSelected = poll.myVotedOptionIds.includes(option.id);
        return (
          <div key={option.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={isVoting}
              onClick={() => void handleVote(option.id)}
              className={`relative flex flex-1 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/60 dark:hover:bg-gray-800'
              }`}
            >
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-100/80 dark:bg-emerald-900/30"
                  style={{ width: `${option.percentage}%` }}
                />
              )}
              <span
                className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-700'
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 12 10" className="h-3 w-3 fill-current">
                    <path d="M1 5.5L4.5 9 11 1" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </span>
              <span className="relative z-10 flex-1 text-[15px] font-medium text-gray-900 dark:text-gray-100">
                {option.text}
              </span>
              {showResults && (
                <span className="relative z-10 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  {option.percentage}%
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </button>
            {canManageOptions && poll.options.length > 2 && (
              <button
                type="button"
                disabled={deletingOptionId === option.id}
                onClick={() => void handleDeleteOption(option.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {deletingOptionId === option.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        );
      })}

      {poll.allowAddOptions && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAddOption();
              }
            }}
            placeholder="Thêm lựa chọn thăm dò ý kiến..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-100"
          />
          {newOptionText.trim() && (
            <button
              type="button"
              disabled={isAddingOption}
              onClick={() => void handleAddOption()}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isAddingOption ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Thêm'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
