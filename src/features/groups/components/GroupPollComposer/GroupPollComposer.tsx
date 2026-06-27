import { Plus, Settings, X } from 'lucide-react';

interface GroupPollComposerProps {
  options: string[];
  onOptionsChange: (options: string[]) => void;
  onRemove: () => void;
  allowAddOptions: boolean;
  onAllowAddOptionsChange: (value: boolean) => void;
}

export function GroupPollComposer({
  options,
  onOptionsChange,
  onRemove,
  allowAddOptions,
  onAllowAddOptionsChange,
}: GroupPollComposerProps) {
  const updateOption = (index: number, value: string) => {
    onOptionsChange(options.map((item, i) => (i === index ? value : item)));
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (options.length >= 10) return;
    onOptionsChange([...options, '']);
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted p-3/50">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Thêm cuộc thăm dò ý kiến</h4>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Lựa chọn ${index + 1}`}
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-[15px] outline-none focus:border-emerald-500 dark:border-gray-500 dark:text-white"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {options.length < 10 && (
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            <Plus className="h-4 w-4" />
            Thêm lựa chọn
          </button>
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>Cho phép thành viên thêm lựa chọn</span>
          <input
            type="checkbox"
            checked={allowAddOptions}
            onChange={(e) => onAllowAddOptionsChange(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
        </label>
      </div>
    </div>
  );
}
