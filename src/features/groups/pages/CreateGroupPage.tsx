import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Globe2,
  Lock,
  Image as ImageIcon,
  Users,
  Smile,
  Monitor,
  Smartphone,
  ChevronDown,
  UserPlus,
  Settings,
  Share2,
  Briefcase,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '@/services/groupService';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { CurrentUserAvatar } from '@/components/shared/CurrentUserAvatar';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useFriends } from '@/features/friends/hooks/useFriends';
import { FriendPickerModal } from '@/features/groups/components/FriendPickerModal/FriendPickerModal';
import { GroupTabBar } from '@/features/groups/components/GroupTabBar/GroupTabBar';
import { GroupDescriptionTab } from '@/features/groups/components/GroupDescriptionTab/GroupDescriptionTab';
import type { GroupDetailTabId } from '@/features/groups/constants/groupDetailTabs';
import { toast } from 'sonner';

export const CreateGroupPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [groupName, setGroupName] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewTab, setPreviewTab] = useState<GroupDetailTabId>('discussion');
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const { data: friends = [] } = useFriends(currentUser?.id);

  useEffect(() => {
    const syncUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncUser);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncUser);
  }, []);

  const selectedFriends = useMemo(
    () => friends.filter((friend) => selectedInviteIds.includes(friend.userId)),
    [friends, selectedInviteIds],
  );

  const removeInviteFriend = (userId: string) => {
    setSelectedInviteIds((prev) => prev.filter((id) => id !== userId));
  };

  const memberPreviewCount = 1 + selectedInviteIds.length;

  const previewMembers = useMemo(() => {
    const members: { userId: string; name: string; avatarUrl?: string | null }[] = [];
    if (currentUser) {
      members.push({
        userId: currentUser.id,
        name: currentUser.fullName || 'Bạn',
        avatarUrl: currentUser.avatarUrl,
      });
    }
    for (const friend of selectedFriends) {
      if (members.some((m) => m.userId === friend.userId)) continue;
      members.push({
        userId: friend.userId,
        name: friend.name,
        avatarUrl: friend.avatar,
      });
    }
    return members;
  }, [currentUser, selectedFriends]);

  const isPrivatePreview = privacy === 'private';

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const newGroup = await groupService.createGroup({
        creatorId: currentUser!.id,
        name: groupName.trim(),
        privacy: privacy === 'public' ? 'PUBLIC' : 'PRIVATE',
      });
      if (selectedInviteIds.length > 0) {
        await groupService.inviteFriends(newGroup.id, currentUser!.id, selectedInviteIds);
      }
      return newGroup;
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'managed'] });
      if (selectedInviteIds.length > 0) {
        toast.success(`Đã tạo nhóm và gửi lời mời đến ${selectedInviteIds.length} người bạn`);
      }
      navigate(`/groups/${newGroup.id}`);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tạo nhóm. Vui lòng thử lại.';
      toast.error(message);
    },
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-[360px] bg-card border-r border-border flex flex-col h-full shrink-0 shadow-sm dark:shadow-none z-10">
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/groups')}
              className="w-10 h-10 rounded-full bg-background hover:bg-muted flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <div className="text-xs text-muted-foreground hover:underline cursor-pointer" onClick={() => navigate('/groups')}>Nhóm &gt; Tạo nhóm</div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">Tạo nhóm</h1>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 mb-6">
            <CurrentUserAvatar className="w-10 h-10 shrink-0" />
            <div>
              <div className="font-semibold text-foreground text-[15px]">
                {currentUser?.fullName || 'Bạn'}
              </div>
              <div className="text-xs text-muted-foreground font-medium tracking-wide">Quản trị viên</div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-3 pt-5 pb-2 border border-border rounded-md outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors bg-transparent"
                />
                <label className="absolute left-3 top-3.5 text-muted-foreground text-[15px] pointer-events-none transition-all peer-placeholder-shown:text-[15px] peer-placeholder-shown:top-3.5 peer-focus:top-1 peer-focus:text-[11px] peer-focus:text-emerald-500 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[11px]">
                  Tên nhóm
                </label>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-md transition-colors ${ isPrivacyOpen ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-sm dark:shadow-none' : 'border-border hover:bg-muted' }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {privacy === 'public' ? (
                      <Globe2 className="w-6 h-6 text-foreground" />
                    ) : (
                      <Lock className="w-6 h-6 text-foreground" />
                    )}
                  </div>
                  <div className="text-left flex flex-col justify-center">
                    <span className={`text-[12px] font-medium leading-tight ${isPrivacyOpen ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      Chọn quyền riêng tư
                    </span>
                    <span className="text-[17px] text-foreground">
                      {privacy === 'public' ? 'Công khai' : 'Riêng tư'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${isPrivacyOpen ? 'text-emerald-600 rotate-180' : 'text-foreground'}`} />
              </button>

              {isPrivacyOpen && (
                <>
                  {/* Invisible overlay for closing dropdown when clicking outside */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsPrivacyOpen(false)} />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute left-[-8px] right-[-8px] top-[105%] bg-card border border-border rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-50 p-2 space-y-1">
                    {/* Public Option */}
                    <div 
                      className={`flex items-start gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors ${privacy === 'public' ? 'bg-background' : ''}`}
                      onClick={() => { setPrivacy('public'); setIsPrivacyOpen(false); }}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                        <Globe2 className="w-6 h-6 text-foreground" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-[17px] font-semibold text-foreground mb-0.5">Công khai</div>
                        <div className="text-[14px] text-foreground mb-1 leading-snug">
                          Bất kỳ ai cũng có thể nhìn thấy mọi người trong nhóm và những gì họ đăng.
                        </div>
                        <div className="text-[13px] text-muted-foreground leading-snug">
                          Tùy theo quy mô và độ tuổi của nhóm, bạn có thể chuyển sang chế độ riêng tư vào lúc khác.
                        </div>
                      </div>
                      <div className="shrink-0 pt-2 flex items-center">
                        <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center transition-colors ${privacy === 'public' ? 'border-emerald-600' : 'border-gray-400'}`}>
                          {privacy === 'public' && <div className="w-3 h-3 rounded-full bg-emerald-600" />}
                        </div>
                      </div>
                    </div>

                    {/* Private Option */}
                    <div 
                      className={`flex items-start gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors ${privacy === 'private' ? 'bg-background' : ''}`}
                      onClick={() => { setPrivacy('private'); setIsPrivacyOpen(false); }}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                        <Lock className="w-6 h-6 text-foreground" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-[17px] font-semibold text-foreground mb-0.5">Riêng tư</div>
                        <div className="text-[14px] text-foreground mb-1 leading-snug">
                          Chỉ thành viên mới nhìn thấy mọi người trong nhóm và những gì họ đăng.
                        </div>
                        <div className="text-[13px] text-muted-foreground leading-snug">
                          Bạn có thể chuyển sang chế độ công khai vào lúc khác.
                        </div>
                      </div>
                      <div className="shrink-0 pt-2 flex items-center">
                        <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center transition-colors ${privacy === 'private' ? 'border-emerald-600' : 'border-gray-400'}`}>
                          {privacy === 'private' && <div className="w-3 h-3 rounded-full bg-emerald-600" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-3.5 border border-border rounded-md hover:border-gray-400 dark:hover:border-border hover:bg-muted/40 transition-colors text-left"
              >
                <UserPlus className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-[15px] text-muted-foreground">
                  {selectedInviteIds.length === 0
                    ? 'Mời bạn bè (không bắt buộc)'
                    : `Đã chọn ${selectedInviteIds.length} người bạn`}
                </span>
              </button>

              {selectedFriends.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedFriends.map((friend) => (
                    <span
                      key={friend.userId}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-full pl-1 pr-2 py-0.5 text-[13px] font-medium max-w-full"
                    >
                      <UserAvatar
                        name={friend.name}
                        avatarUrl={friend.avatar}
                        userId={friend.userId}
                        rounded="full"
                        className="w-5 h-5 shrink-0"
                      />
                      <span className="truncate max-w-[120px]">{friend.name}</span>
                      <button
                        type="button"
                        onClick={() => removeInviteFriend(friend.userId)}
                        className="p-0.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        aria-label={`Bỏ ${friend.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => createGroupMutation.mutate()}
            className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${ groupName.trim() && !createGroupMutation.isPending ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-muted text-muted-foreground cursor-not-allowed' }`}
            disabled={!groupName.trim() || !currentUser || createGroupMutation.isPending}
          >
            {createGroupMutation.isPending ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </div>

      <FriendPickerModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        selectedUserIds={selectedInviteIds}
        onConfirm={setSelectedInviteIds}
        title="Mời bạn bè"
        description="Tìm và chọn bạn bè bạn muốn mời vào nhóm mới."
      />

      {/* Main Preview Area */}
      <div className="flex-1 overflow-y-auto bg-background flex flex-col items-center py-6 px-4">
        <div
          className={`w-full transition-all duration-300 ${previewMode === 'desktop' ? 'max-w-[1020px]' : 'max-w-[400px]'}`}
        >
          <div className="bg-card rounded-lg shadow-sm dark:shadow-none border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <span className="font-semibold text-foreground text-[15px]">
                Xem trước trên {previewMode === 'desktop' ? 'máy tính' : 'điện thoại'}
              </span>
              <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-card shadow-sm dark:shadow-none text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Monitor className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-card shadow-sm dark:shadow-none text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Smartphone className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-background">
              <div className="bg-card shadow-sm dark:shadow-none border-b border-border">
                <div className="max-w-[940px] mx-auto px-4 sm:px-6">
                  <div className="relative w-full h-[160px] sm:h-[220px] md:h-[280px] rounded-b-xl overflow-hidden bg-[#fdf0e6]">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-orange-500 to-red-500 opacity-90" />
                    <svg
                      className="absolute inset-0 w-full h-full opacity-80"
                      viewBox="0 0 1200 400"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <rect width="1200" height="400" fill="url(#createGroupGrad)" />
                      <defs>
                        <linearGradient id="createGroupGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FF6B6B" stopOpacity={1} />
                          <stop offset="50%" stopColor="#4ECDC4" stopOpacity={1} />
                          <stop offset="100%" stopColor="#45B7D1" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <path d="M0,400 C300,300 600,500 1200,300 L1200,0 L0,0 Z" fill="#ffffff" opacity="0.1" />
                      <circle cx="200" cy="150" r="40" fill="#fff" opacity="0.2" />
                      <circle cx="900" cy="250" r="70" fill="#fff" opacity="0.15" />
                    </svg>
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-8 p-6 opacity-60">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-card/20 backdrop-blur" />
                      <div className="w-20 h-20 sm:w-32 sm:h-32 bg-yellow-400/30 rotate-12" />
                      <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full bg-emerald-500/20 backdrop-blur" />
                    </div>
                  </div>

                  <div className="pt-4 pb-2 sm:pt-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                      {groupName || 'Tên nhóm'}
                    </h1>
                    <div className="flex items-center text-[15px] text-muted-foreground gap-1.5 font-medium mb-4">
                      {isPrivatePreview ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      <span>Nhóm {isPrivatePreview ? 'Riêng tư' : 'Công khai'}</span>
                      <span>·</span>
                      <span className="font-semibold text-foreground">
                        {memberPreviewCount} thành viên
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-3">
                      <div className="flex -space-x-2 overflow-hidden">
                        {previewMembers.slice(0, 8).map((member) => (
                          <UserAvatar
                            key={member.userId}
                            avatarUrl={member.avatarUrl}
                            name={member.name}
                            userId={member.userId}
                            rounded="full"
                            className="w-10 h-10 border-2 border-white ring-2 ring-white dark:ring-gray-800"
                            initialsClassName="text-sm font-semibold"
                          />
                        ))}
                        {previewMembers.length > 8 && (
                          <div className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center text-muted-foreground text-xs font-semibold ring-2 ring-white dark:ring-gray-800">
                            +{previewMembers.length - 8}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 opacity-90 cursor-default"
                        >
                          <span className="text-xl leading-none -mt-0.5">+</span> Mời
                        </button>
                        <button
                          type="button"
                          disabled
                          className="bg-muted text-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-default"
                        >
                          <Settings className="w-5 h-5" />
                          {previewMode === 'mobile' ? '' : 'Cài đặt'}
                        </button>
                        <button
                          type="button"
                          disabled
                          className="bg-muted text-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-default"
                        >
                          <Share2 className="w-5 h-5" />
                          {previewMode === 'mobile' ? '' : 'Chia sẻ'}
                        </button>
                      </div>
                    </div>

                    <GroupTabBar
                      activeTab={previewTab}
                      onTabChange={setPreviewTab}
                      memberCount={memberPreviewCount}
                      isAdmin
                    />
                  </div>
                </div>
              </div>

              <div className="mx-auto max-w-[940px] px-4 sm:px-6 py-4 lg:py-6">
                {previewTab === 'description' && (
                  <GroupDescriptionTab
                    description={null}
                    privacy={isPrivatePreview ? 'private' : 'public'}
                    memberCount={memberPreviewCount}
                    isAdmin
                    onEditDescription={() => {}}
                  />
                )}

                {previewTab === 'discussion' && (
                  <div className="bg-card rounded-lg shadow-sm dark:shadow-none p-4 border border-border">
                    <div className="flex gap-2 items-center mb-3">
                      <CurrentUserAvatar className="w-10 h-10 shrink-0" />
                      <div className="flex-1 bg-background rounded-full py-2.5 px-4 text-muted-foreground text-[15px] cursor-default">
                        Bạn đang nghĩ gì?
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 flex flex-wrap">
                      <div className="flex-1 min-w-[100px] flex justify-center items-center gap-2 py-2 text-muted-foreground font-semibold text-[15px]">
                        <ImageIcon className="w-6 h-6 text-green-500" />
                        {previewMode === 'desktop' && 'Ảnh/video'}
                      </div>
                      <div className="flex-1 min-w-[100px] flex justify-center items-center gap-2 py-2 text-muted-foreground font-semibold text-[15px]">
                        <Smile className="w-6 h-6 text-yellow-500" />
                        {previewMode === 'desktop' && 'Cảm xúc'}
                      </div>
                      <div className="flex-1 min-w-[100px] flex justify-center items-center gap-2 py-2 text-muted-foreground font-semibold text-[15px]">
                        <Briefcase className="w-6 h-6 text-orange-500" />
                        {previewMode === 'desktop' && 'Thăm dò ý kiến'}
                      </div>
                    </div>
                  </div>
                )}

                {previewTab === 'members' && (
                  <div className="bg-card rounded-lg shadow-sm dark:shadow-none p-4 border border-border">
                    <h3 className="font-semibold text-foreground mb-4">
                      Thành viên · {memberPreviewCount}
                    </h3>
                    <div className="space-y-3">
                      {previewMembers.map((member) => (
                        <div key={member.userId} className="flex items-center gap-3">
                          <UserAvatar
                            name={member.name}
                            avatarUrl={member.avatarUrl}
                            userId={member.userId}
                            rounded="full"
                            className="w-10 h-10"
                          />
                          <span className="font-medium text-foreground">{member.name}</span>
                          {member.userId === currentUser?.id && (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              Quản trị viên
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewTab !== 'discussion' && previewTab !== 'members' && previewTab !== 'description' && (
                  <div className="bg-card rounded-lg shadow-sm dark:shadow-none p-8 border border-border text-center text-muted-foreground text-sm">
                    Nội dung tab sẽ hiển thị sau khi tạo nhóm.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
