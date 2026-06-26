import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { BirthdayFriend } from '../hooks/useBirthdays';
import { useSendBirthdayWish } from '../hooks/useBirthdays';

interface SendWishDialogProps {
  friend: BirthdayFriend | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
}

export function SendWishDialog({ friend, open, onOpenChange, initialMessage = '' }: SendWishDialogProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState(initialMessage);
  const sendWish = useSendBirthdayWish();

  useEffect(() => {
    if (open) {
      setMessage(initialMessage);
    }
  }, [open, initialMessage]);

  if (!open || !friend) return null;

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error(t('birthdays.wishRequired'));
      return;
    }
    if (trimmed.length > 500) {
      toast.error(t('birthdays.wishMaxLength'));
      return;
    }

    try {
      await sendWish.mutateAsync({ recipientId: friend.userId, message: trimmed });
      toast.success(t('birthdays.sendSuccess', { name: friend.name }));
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message || t('birthdays.sendError'));
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('birthdays.sendDialogTitle', { name: friend.name })}
          </h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('birthdays.wishPlaceholder')}
          rows={4}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800"
        />
        <p className="mt-1 text-right text-xs text-gray-500">{message.length}/500</p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={sendWish.isPending}
            onClick={() => void handleSubmit()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {sendWish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('birthdays.sendWish')}
          </button>
        </div>
      </div>
    </div>
  );
}
