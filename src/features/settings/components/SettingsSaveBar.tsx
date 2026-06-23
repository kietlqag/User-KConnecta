import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsSaveBarProps {
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}

export function SettingsSaveBar({ isDirty, saving, onSave, onDiscard }: SettingsSaveBarProps) {
  if (!isDirty) return null;

  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-8 border-t border-border bg-background/95 px-1 py-4 backdrop-blur-sm">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {onDiscard ? (
          <Button type="button" variant="ghost" onClick={onDiscard} disabled={saving} className="rounded-[10px]">
            Hủy
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="min-w-[140px] rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            'Lưu thay đổi'
          )}
        </Button>
      </div>
    </div>
  );
}
