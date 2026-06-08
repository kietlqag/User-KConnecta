export type SetupStepId = 'invite' | 'welcome_post' | 'cover' | 'description';

export interface SetupStep {
  id: SetupStepId;
  label: string;
  helper: string;
  actionLabel: string;
  done: boolean;
}

export interface GroupSetupProgressInput {
  memberCount: number;
  hasCover: boolean;
  hasDescription: boolean;
  hasPosts: boolean;
  inviteSent: boolean;
}

export interface GroupSetupProgress {
  steps: SetupStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  nextStep: SetupStep | null;
  progressPercent: number;
}

const STEP_DEFS: Omit<SetupStep, 'done'>[] = [
  {
    id: 'invite',
    label: 'Mời thành viên đầu tiên',
    helper: 'Gợi ý: mời ít nhất 1 người để nhóm có không khí.',
    actionLabel: 'Mời',
  },
  {
    id: 'welcome_post',
    label: 'Đăng bài chào mừng',
    helper: 'Giới thiệu mục đích nhóm — thành viên mới sẽ thấy ngay.',
    actionLabel: 'Viết bài',
  },
  {
    id: 'cover',
    label: 'Thêm ảnh bìa',
    helper: 'Giúp nhóm dễ nhận diện trong danh sách.',
    actionLabel: 'Tải ảnh',
  },
  {
    id: 'description',
    label: 'Viết mô tả ngắn',
    helper: 'Nói rõ ai nên tham gia và quy tắc cơ bản.',
    actionLabel: 'Thêm mô tả',
  },
];

export function useGroupSetupProgress(input: GroupSetupProgressInput): GroupSetupProgress {
  const doneById: Record<SetupStepId, boolean> = {
    invite: input.memberCount >= 2 || input.inviteSent,
    welcome_post: input.hasPosts,
    cover: input.hasCover,
    description: input.hasDescription,
  };

  const steps: SetupStep[] = STEP_DEFS.map(def => ({
    ...def,
    done: doneById[def.id],
  }));

  const completedCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const nextStep = steps.find(s => !s.done) ?? null;

  return {
    steps,
    completedCount,
    totalCount,
    isComplete: completedCount === totalCount,
    nextStep,
    progressPercent: Math.round((completedCount / totalCount) * 100),
  };
}

export const SETUP_DISMISS_KEY = (groupId: string) => `group-setup-dismissed-${groupId}`;
export const SETUP_COMPLETE_TOAST_KEY = (groupId: string) => `group-setup-complete-toast-${groupId}`;
