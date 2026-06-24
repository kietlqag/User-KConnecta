import type { GroupSetupProgress } from '../../hooks/useGroupSetupProgress';

interface GroupActivationMobileBarProps {
  progress: GroupSetupProgress;
  onContinue: () => void;
}

export function GroupActivationMobileBar({ progress, onContinue }: GroupActivationMobileBarProps) {
  if (progress.isComplete) return null;

  const label = progress.nextStep?.label ?? 'Hoàn thiện nhóm';

  return (
    <div className="md:hidden sticky top-0 z-[5] -mx-4 px-4 py-2 bg-emerald-50 border-b border-emerald-100 mb-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-emerald-900 truncate">
            Thiết lập nhóm · {progress.completedCount}/{progress.totalCount}
          </p>
          <p className="text-[12px] text-emerald-700 truncate">{label}</p>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="shrink-0 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold rounded-lg"
        >
          Tiếp tục
        </button>
      </div>
      <div className="h-1 bg-emerald-200 rounded-full mt-2 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>
    </div>
  );
}
