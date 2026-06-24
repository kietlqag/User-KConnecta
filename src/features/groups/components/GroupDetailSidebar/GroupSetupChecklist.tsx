import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Edit3, Image as ImageIcon, PenTool, Users, X } from 'lucide-react';
import type { GroupSetupProgress, SetupStep, SetupStepId } from '../../hooks/useGroupSetupProgress';

const STEP_ICONS: Record<SetupStepId, typeof Users> = {
  invite: Users,
  welcome_post: PenTool,
  cover: ImageIcon,
  description: Edit3,
};

interface GroupSetupChecklistProps {
  progress: GroupSetupProgress;
  onDismiss: () => void;
  onStepAction: (stepId: SetupStepId) => void;
}

export function GroupSetupChecklist({ progress, onDismiss, onStepAction }: GroupSetupChecklistProps) {
  const [expanded, setExpanded] = useState(false);
  const { completedCount, totalCount, isComplete, nextStep, steps, progressPercent } = progress;

  if (isComplete) {
    return null;
  }

  const visibleSteps = expanded ? steps : steps.filter(s => !s.done || s.id === nextStep?.id);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-[17px] leading-tight">Sẵn sàng mở nhóm chưa?</h3>
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mt-1">
            <span className="text-green-600">{completedCount}/{totalCount}</span> hoàn thành
          </p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-snug mt-1">
            Hoàn thành {totalCount} việc nhỏ để thu hút thành viên và bài viết đầu tiên.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-400 hover:bg-muted p-1.5 rounded-full transition-colors shrink-0"
          aria-label="Ẩn hướng dẫn"
          title="Ẩn hướng dẫn"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {nextStep && (
        <>
          <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-2">
            Bước tiếp: <span className="font-semibold text-gray-900 dark:text-gray-100">{nextStep.label}</span>
          </p>
          <button
            type="button"
            onClick={() => onStepAction(nextStep.id)}
            className="w-full py-2.5 mb-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[15px] transition-colors"
          >
            Làm bước tiếp theo
          </button>
        </>
      )}

      <div className="space-y-0.5">
        {visibleSteps.map(step => (
          <SetupStepRow key={step.id} step={step} onAction={() => onStepAction(step.id)} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full mt-2 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1"
      >
        {expanded ? (
          <>
            Thu gọn <ChevronUp className="w-4 h-4" />
          </>
        ) : (
          <>
            Xem tất cả bước <ChevronDown className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

function SetupStepRow({ step, onAction }: { step: SetupStep; onAction: () => void }) {
  const Icon = STEP_ICONS[step.id];

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[44px]">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          step.done ? 'bg-green-100' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        {step.done ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className={`font-semibold text-[15px] ${step.done ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
          {step.label}
        </div>
        {!step.done && <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-snug">{step.helper}</p>}
      </div>
      {!step.done && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 px-3 py-1.5 text-[13px] font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          {step.actionLabel}
        </button>
      )}
    </div>
  );
}
