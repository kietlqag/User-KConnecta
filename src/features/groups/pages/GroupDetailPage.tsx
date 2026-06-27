import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../home/components/Header';
import {
  GroupsLeftSidebar,
  GroupFeed,
  InviteFriendsModal,
  GroupActivationMobileBar,
  GroupSetupChecklist,
  EditGroupDescriptionModal,
  EditGroupNameModal,
  GroupTabBar,
  GroupMembersTab,
  GroupDescriptionTab,
  GroupMediaTab,
  GroupEventsTab,
  GroupAlbumsTab,
} from '../components';
import { GroupRequestsTab } from '../components/GroupRequestsTab/GroupRequestsTab';
import { GroupFeaturedPosts } from '../components/GroupFeaturedPosts/GroupFeaturedPosts';
import { useGroupPinnedPosts, usePinPost, useUnpinPost } from '../hooks/useGroupPins';
import {
  DEFAULT_GROUP_TAB,
  isGroupDetailTabId,
  type GroupDetailTabId,
} from '../constants/groupDetailTabs';
import { Edit3, MoreHorizontal, Lock, Users, Globe2, Image as ImageIcon, AlertTriangle, Loader2, X, Settings } from 'lucide-react';
import { useGroupSetupProgress, type SetupStepId } from '../hooks/useGroupSetupProgress';
import {
  dismissSetup,
  isSetupDismissed,
  hasShownSetupCompleteToast,
  markSetupCompleteToastShown,
  isInviteSent,
  markInviteSent,
} from '../utils/groupSetupStorage';
import { useGroupById, useJoinedGroups, useManagedGroups, useJoinGroup, useGroupMembers, useRemoveMember, useLeaveGroup, useGroupJoinRequests, useUpdateMemberApproval, useUpdateGroupPrivacy, useDisbandGroup } from '../hooks/useGroups';
import { useGroupSocket } from '../hooks/useGroupSocket';
import { groupService, GROUP_MEMBERSHIP_CHANGED_EVENT } from '@/services/groupService';
import { authService } from '@/services/authService';
import { UserAvatar } from '@/components/shared';
import { GroupShareModal } from '@/components/posts/GroupShareModal';
import { toast } from 'sonner';

export const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const currentUser = authService.getCurrentUser();
  const { data: group } = useGroupById(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: managedGroups = [] } = useManagedGroups();
  const { data: joinedGroups = [] } = useJoinedGroups();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: GroupDetailTabId = isGroupDetailTabId(tabParam) ? tabParam : DEFAULT_GROUP_TAB;

  const setActiveTab = useCallback(
    (tabId: GroupDetailTabId) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (tabId === DEFAULT_GROUP_TAB) next.delete('tab');
          else next.set('tab', tabId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const joinGroupMutation = useJoinGroup();

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCoverMenu, setShowCoverMenu] = useState(false);

  const [coverError, setCoverError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [removingMember, setRemovingMember] = useState<{ userId: string; fullName: string } | null>(null);
  const navigate = useNavigate();
  const removeMemberMutation = useRemoveMember();
  const leaveGroupMutation = useLeaveGroup();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const updateMemberApprovalMutation = useUpdateMemberApproval();
  const updateGroupPrivacyMutation = useUpdateGroupPrivacy();
  const disbandGroupMutation = useDisbandGroup();
  const [setupDismissed, setSetupDismissed] = useState(() => (groupId ? isSetupDismissed(groupId) : false));
  const [postCount, setPostCount] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(() => (groupId ? isInviteSent(groupId) : false));
  const isAdmin = group?.role === 'ADMIN';
  const { data: joinRequests = [] } = useGroupJoinRequests(isAdmin ? groupId : undefined);
  const pendingCount = joinRequests.length;

  // Pinned (featured) posts
  const { data: pinnedPosts = [] } = useGroupPinnedPosts(groupId);
  const pinnedPostIds = useMemo(() => new Set(pinnedPosts.map(p => p.post.id)), [pinnedPosts]);
  const pinPostMutation = usePinPost(groupId);
  const unpinPostMutation = useUnpinPost(groupId);
  const handlePinPost = useCallback((postId: string) => {
    pinPostMutation.mutate({ postId }, {
      onSuccess: () => toast.success('Đã ghim bài viết lên khu nổi bật'),
      onError: (err: any) => toast.error(err?.response?.data?.message || 'Không thể ghim bài viết'),
    });
  }, [pinPostMutation]);
  const handleUnpinPost = useCallback((postId: string) => {
    unpinPostMutation.mutate(postId, {
      onSuccess: () => toast.success('Đã bỏ ghim bài viết'),
      onError: (err: any) => toast.error(err?.response?.data?.message || 'Không thể bỏ ghim'),
    });
  }, [unpinPostMutation]);

  const setupProgress = useGroupSetupProgress({
    memberCount: members.length,
    hasCover: !!(group?.icon?.trim()),
    hasDescription: !!(group?.description?.trim()),
    hasPosts: postCount > 0,
    inviteSent,
  });

  const showSetupChecklist = isAdmin && !setupDismissed;

  useEffect(() => {
    if (!groupId) return;
    setSetupDismissed(isSetupDismissed(groupId));
  }, [groupId]);

  // Realtime: when a group membership notification arrives (e.g. an admin approves a join
  // request), refetch group data so the view updates without a manual reload.
  useEffect(() => {
    const handleMembershipChange = () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    };
    window.addEventListener(GROUP_MEMBERSHIP_CHANGED_EVENT, handleMembershipChange);
    return () => window.removeEventListener(GROUP_MEMBERSHIP_CHANGED_EVENT, handleMembershipChange);
  }, [queryClient]);

  // Realtime: when a member leaves or is removed, the group broadcasts on its topic
  // so member avatars and the count update live for everyone viewing the group.
  useGroupSocket(
    groupId,
    Boolean(currentUser),
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'pinned', groupId] });
    }, [queryClient, groupId]),
  );

  useEffect(() => {
    if (!groupId || !setupProgress.isComplete || !isAdmin) return;
    if (hasShownSetupCompleteToast(groupId)) return;
    toast.success('Nhóm đã sẵn sàng! Tiếp tục mời thêm thành viên nhé.');
    markSetupCompleteToastShown(groupId);
  }, [groupId, setupProgress.isComplete, isAdmin]);

  const scrollToComposer = useCallback(() => {
    document.getElementById('group-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSetupStep = useCallback(
    (stepId: SetupStepId) => {
      switch (stepId) {
        case 'invite':
          setIsInviteModalOpen(true);
          break;
        case 'welcome_post':
          scrollToComposer();
          setComposerOpen(true);
          break;
        case 'cover':
          fileInputRef.current?.click();
          break;
        case 'description':
          setActiveTab('description');
          setDescriptionModalOpen(true);
          break;
      }
    },
    [scrollToComposer, setActiveTab],
  );

  const handleDismissSetup = useCallback(() => {
    if (groupId) dismissSetup(groupId);
    setSetupDismissed(true);
  }, [groupId]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m => m.fullName.toLowerCase().includes(q));
  }, [members, memberSearch]);

  const adminMembers = useMemo(() => filteredMembers.filter(m => m.role === 'ADMIN'), [filteredMembers]);
  const regularMembers = useMemo(() => filteredMembers.filter(m => m.role !== 'ADMIN'), [filteredMembers]);

  const uploadCoverMutation = useMutation({
    mutationFn: (file: File) => groupService.updateCoverPhoto(groupId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'managed'] });
      setCoverError(null);
      cancelPreview();
    },
    onError: (err: Error) => {
      setCoverError(err.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    },
  });

  const removeCoverMutation = useMutation({
    mutationFn: () => groupService.removeCoverPhoto(groupId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'managed'] });
    },
    onError: (err: Error) => {
      setCoverError(err.message || 'Không thể xóa ảnh bìa.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  // Private groups hide content from non-approved members — applies to discussion and media.
  const isPrivateLocked =
    group?.privacy === 'private' && group.role !== 'ADMIN' && group.role !== 'MEMBER';

  const privateLockScreen = (
    <div className="bg-card rounded-xl shadow-sm dark:shadow-none border border-border p-12 flex flex-col items-center justify-center min-h-[350px] text-center">
      <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Nhóm riêng tư</h3>
      <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
        {group?.role === 'PENDING'
          ? 'Yêu cầu tham gia của bạn đang chờ quản trị viên phê duyệt.'
          : 'Chỉ thành viên được phê duyệt mới xem được nội dung nhóm này.'}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex min-w-0 flex-1 items-start pt-14">
        <GroupsLeftSidebar
          joinedGroups={joinedGroups}
          managedGroups={managedGroups}
          activeSectionId={null}
          showGroupLists={false}
        />

        <main className="min-w-0 flex-1">
          <div className="bg-card shadow-sm dark:shadow-none border-b border-border">
            <div className="max-w-[940px] mx-auto px-4 sm:px-6">
              {/* Banner */}
              <div className="relative w-full h-[200px] sm:h-[280px] md:h-[350px] rounded-b-xl overflow-hidden bg-[#fdf0e6]">
                {previewUrl || group?.icon ? (
                  <img
                    src={previewUrl ?? group!.icon}
                    alt="Ảnh bìa nhóm"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-orange-500 to-red-500 opacity-90" />
                    <svg className="absolute inset-0 w-full h-full opacity-80" viewBox="0 0 1200 400" preserveAspectRatio="none">
                      <rect width="1200" height="400" fill="url(#grad)" />
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{stopColor: '#FF6B6B', stopOpacity: 1}} />
                          <stop offset="50%" style={{stopColor: '#4ECDC4', stopOpacity: 1}} />
                          <stop offset="100%" style={{stopColor: '#45B7D1', stopOpacity: 1}} />
                        </linearGradient>
                      </defs>
                      <path d="M0,400 C300,300 600,500 1200,300 L1200,0 L0,0 Z" fill="#ffffff" opacity="0.1"/>
                      <circle cx="200" cy="150" r="40" fill="#fff" opacity="0.2" />
                      <circle cx="900" cy="250" r="70" fill="#fff" opacity="0.15" />
                    </svg>
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-12 p-8">
                      <div className="w-24 h-24 rounded-full bg-card/20 backdrop-blur" />
                      <div className="w-32 h-32 bg-yellow-400/30 rotate-12" />
                      <div className="w-40 h-40 rounded-full bg-emerald-500/20 backdrop-blur" />
                    </div>
                  </>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Bottom-right controls — admin only */}
                {isAdmin && (previewUrl ? (
                  <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex gap-2">
                    <button
                      onClick={cancelPreview}
                      className="bg-card hover:bg-muted text-foreground px-4 py-2 rounded-lg font-semibold shadow-sm dark:shadow-none transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => selectedFile && uploadCoverMutation.mutate(selectedFile)}
                      disabled={uploadCoverMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold shadow-sm dark:shadow-none transition-colors"
                    >
                      {uploadCoverMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                ) : (
                  <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
                    <button
                      onClick={() => setShowCoverMenu(v => !v)}
                      className="bg-card hover:bg-muted text-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm dark:shadow-none transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                    {showCoverMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowCoverMenu(false)} />
                        <div className="absolute bottom-full right-0 mb-2 bg-card rounded-xl shadow-lg border border-border z-20 py-1 min-w-[220px]">
                          <button
                            onClick={() => { fileInputRef.current?.click(); setShowCoverMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-foreground font-medium text-[15px] text-left"
                          >
                            <ImageIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                            Tải ảnh bìa lên
                          </button>
                          {group?.icon && (
                            <button
                              onClick={() => { removeCoverMutation.mutate(); setShowCoverMenu(false); }}
                              disabled={removeCoverMutation.isPending}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-foreground font-medium text-[15px] text-left disabled:opacity-50"
                            >
                              <X className="w-5 h-5 text-muted-foreground shrink-0" />
                              Xóa ảnh bìa
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Cover photo error */}
              {coverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 flex items-center justify-between">
                  <span>{coverError}</span>
                  <button onClick={() => setCoverError(null)} className="ml-4 text-red-500 hover:text-red-700 font-bold">✕</button>
                </div>
              )}

              {/* Group Header Info */}
              <div className="pt-4 pb-2 sm:pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{group?.name}</h1>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setNameModalOpen(true)}
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted dark:text-muted-foreground transition-colors"
                      title="Đổi tên nhóm"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center text-[15px] text-muted-foreground gap-1.5 font-medium mb-4">
                  {group?.privacy === 'private' ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  <span>Nhóm {group?.privacy === 'private' ? 'Riêng tư' : 'Công khai'}</span>
                  <span>·</span>
                  <span className="font-semibold text-foreground">{group?.members ?? 0} thành viên</span>
                </div>
                
                {/* Action buttons row */}
                <div className="flex flex-wrap items-center justify-between border-b border-border pb-4">
                  {/* Avatars */}
                  <div className="flex items-center mb-2 sm:mb-0">
                    <div className="flex -space-x-2 overflow-hidden">
                      {members.slice(0, 8).map((member) => (
                        <UserAvatar
                          key={member.id}
                          avatarUrl={member.avatarUrl}
                          name={member.fullName}
                          userId={member.userId}
                          rounded="full"
                          className="w-10 h-10 border-2 border-white ring-2 ring-white"
                          initialsClassName="text-sm font-semibold"
                        />
                      ))}
                      {members.length > 8 && (
                        <div className="w-10 h-10 rounded-full bg-background border-2 border-white flex items-center justify-center text-muted-foreground text-xs font-semibold ring-2 ring-white">
                          +{members.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    {!group?.role && (
                      <button
                        onClick={() => {
                          joinGroupMutation.mutate(groupId!, {
                            onSuccess: (result) => {
                              toast.success(
                                result?.status === 'APPROVED'
                                  ? 'Bạn đã tham gia nhóm thành công!'
                                  : 'Đã gửi yêu cầu tham gia nhóm. Vui lòng chờ quản trị viên phê duyệt!'
                              );
                              queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
                            },
                            onError: (err: any) => {
                              toast.error(err?.response?.data?.message || 'Không thể tham gia nhóm. Vui lòng thử lại.');
                            }
                          });
                        }}
                        disabled={joinGroupMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {joinGroupMutation.isPending ? 'Đang xử lý...' : 'Tham gia nhóm'}
                      </button>
                    )}
                    {group?.role === 'PENDING' && (
                      <button
                        disabled
                        className="bg-muted text-muted-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-not-allowed"
                      >
                        Đang chờ duyệt...
                      </button>
                    )}
                    {(group?.role === 'ADMIN' || group?.role === 'MEMBER') && (
                      <>
                        <button
                          onClick={() => setIsInviteModalOpen(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <span className="text-xl leading-none -mt-0.5">+</span> Mời
                        </button>
                        <button
                          onClick={() => setShowSettings(true)}
                          className="bg-muted hover:bg-muted text-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                          title="Cài đặt nhóm"
                        >
                          <Settings className="w-5 h-5" />
                          Cài đặt
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="bg-muted hover:bg-muted text-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
                      Chia sẻ
                    </button>
                  </div>
                </div>
                
                <GroupTabBar
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  memberCount={members.length}
                  isAdmin={isAdmin}
                  pendingCount={pendingCount}
                />
              </div>
            </div>
          </div>
          
          {/* Main Layout Area */}
          <div className="mx-auto max-w-[940px] px-4 sm:px-6 py-4 lg:py-6">
            {group && (
              <div
                role="tabpanel"
                id={`group-tabpanel-${activeTab}`}
                aria-labelledby={`group-tab-${activeTab}`}
                className="min-w-0"
              >
                {isAdmin && showSetupChecklist && activeTab === 'discussion' && (
                  <GroupActivationMobileBar
                    progress={setupProgress}
                    onContinue={() => setupProgress.nextStep && handleSetupStep(setupProgress.nextStep.id)}
                  />
                )}
                {isAdmin && showSetupChecklist && activeTab === 'discussion' && !setupProgress.isComplete && (
                  <div className="mb-4 hidden lg:block">
                    <GroupSetupChecklist
                      progress={setupProgress}
                      onDismiss={handleDismissSetup}
                      onStepAction={handleSetupStep}
                    />
                  </div>
                )}
                {activeTab === 'description' && group && (
                  isPrivateLocked ? (
                    privateLockScreen
                  ) : (
                    <GroupDescriptionTab
                      description={group.description}
                      privacy={group.privacy}
                      memberCount={members.length}
                      isAdmin={isAdmin}
                      onEditDescription={() => setDescriptionModalOpen(true)}
                    />
                  )
                )}

                {activeTab === 'members' && (
                    <GroupMembersTab
                      members={members}
                      adminMembers={adminMembers}
                      regularMembers={regularMembers}
                      memberSearch={memberSearch}
                      onMemberSearchChange={setMemberSearch}
                      isAdmin={isAdmin}
                      onInvite={() => setIsInviteModalOpen(true)}
                      onMemberClick={userId => navigate(`/profile/${userId}`)}
                      onRemoveMember={isAdmin ? m => setRemovingMember(m) : undefined}
                    />
                  )}

                  {activeTab === 'requests' && groupId && isAdmin && (
                    <GroupRequestsTab
                      groupId={groupId}
                      onApproveSuccess={() => queryClient.invalidateQueries({ queryKey: ['groups', 'members', groupId] })}
                    />
                  )}

                  {activeTab === 'discussion' && groupId && (
                    isPrivateLocked ? privateLockScreen : (
                      <>
                        <GroupFeaturedPosts groupId={groupId} isAdmin={isAdmin} />
                        <GroupFeed
                          groupId={groupId}
                          isApprovedMember={group?.role === 'ADMIN' || group?.role === 'MEMBER'}
                          composerOpen={composerOpen}
                          onComposerOpenChange={setComposerOpen}
                          onPostsLoaded={setPostCount}
                          isAdmin={isAdmin}
                          pinnedPostIds={pinnedPostIds}
                          onPin={handlePinPost}
                          onUnpin={handleUnpinPost}
                        />
                      </>
                    )
                  )}

                  {activeTab === 'media' && groupId && (
                    isPrivateLocked ? privateLockScreen : <GroupMediaTab groupId={groupId} />
                  )}

                  {activeTab === 'albums' && groupId && (
                    isPrivateLocked ? privateLockScreen : (
                      <GroupAlbumsTab
                        groupId={groupId}
                        canCreate={group?.role === 'ADMIN' || group?.role === 'MEMBER'}
                      />
                    )
                  )}

                {activeTab === 'events' && groupId && (
                  isPrivateLocked ? privateLockScreen : <GroupEventsTab groupId={groupId} />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {groupId && group && (
        <EditGroupDescriptionModal
          groupId={groupId}
          isOpen={descriptionModalOpen}
          initialDescription={group.description}
          onClose={() => setDescriptionModalOpen(false)}
        />
      )}

      {groupId && group && (
        <EditGroupNameModal
          groupId={groupId}
          isOpen={nameModalOpen}
          initialName={group.name}
          onClose={() => setNameModalOpen(false)}
        />
      )}

      {groupId && (
        <InviteFriendsModal 
          groupId={groupId}
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          existingMemberIds={members.map(m => m.userId)}
          onInviteSuccess={() => {
            if (groupId) {
              markInviteSent(groupId);
              setInviteSent(true);
            }
          }}
        />
      )}

      {groupId && group && (
        <GroupShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          groupId={groupId}
          groupName={group.name}
          groupCoverUrl={group.icon}
          groupPrivacy={group.privacy === 'private' ? 'PRIVATE' : 'PUBLIC'}
          groupMemberCount={group.members ?? members.length}
        />
      )}

      {/* Group Settings Modal */}
      {showSettings && group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="flex w-full max-w-md max-h-[min(90vh,100%)] flex-col bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Cài đặt nhóm
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              {isAdmin && (
                <div>
                  <p className="font-semibold text-foreground">Tên nhóm</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Hiện tại: <span className="font-medium text-foreground">{group.name}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowSettings(false); setNameModalOpen(true); }}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm font-semibold transition-colors"
                  >
                    Đổi tên nhóm
                  </button>
                </div>
              )}

              {isAdmin && (
                <div className="pt-5 border-t border-border">
                  <p className="font-semibold text-foreground">Quyền riêng tư</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Chọn ai có thể tìm thấy nhóm và xem nội dung.
                  </p>
                  <div className="space-y-2">
                    {([
                      {
                        value: 'public' as const,
                        label: 'Công khai',
                        description: 'Mọi người có thể tìm thấy nhóm và xem nội dung công khai.',
                        icon: Globe2,
                      },
                      {
                        value: 'private' as const,
                        label: 'Riêng tư',
                        description: 'Chỉ thành viên mới xem được danh sách thành viên và bài đăng.',
                        icon: Lock,
                      },
                    ]).map((option) => {
                      const selected = group.privacy === option.value;
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={updateGroupPrivacyMutation.isPending || selected}
                          onClick={() => {
                            if (selected || !groupId) return;
                            updateGroupPrivacyMutation.mutate(
                              {
                                groupId,
                                privacy: option.value === 'public' ? 'PUBLIC' : 'PRIVATE',
                              },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    option.value === 'public'
                                      ? 'Đã chuyển nhóm sang Công khai.'
                                      : 'Đã chuyển nhóm sang Riêng tư.',
                                  ),
                                onError: (err: any) =>
                                  toast.error(err?.response?.data?.message || err?.message || 'Không thể cập nhật quyền riêng tư.'),
                              },
                            );
                          }}
                          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-default ${ selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-border hover:bg-muted/50' }`}
                        >
                          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${selected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                              {option.label}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                          </div>
                          <div className={`ml-auto mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? 'border-emerald-600' : 'border-border'}`}>
                            {selected && <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-start justify-between gap-4 pt-5 border-t border-border">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Duyệt thành viên</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Khi bật, yêu cầu tham gia cần quản trị viên phê duyệt. Khi tắt, thành viên mới được tham gia ngay.
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={group.memberApprovalRequired}
                    disabled={updateMemberApprovalMutation.isPending}
                    onClick={() =>
                      updateMemberApprovalMutation.mutate(
                        { groupId: groupId!, memberApprovalRequired: !group.memberApprovalRequired },
                        {
                          onSuccess: () =>
                            toast.success(
                              group.memberApprovalRequired
                                ? 'Đã tắt duyệt thành viên. Thành viên mới sẽ được tham gia ngay.'
                                : 'Đã bật duyệt thành viên. Yêu cầu tham gia cần được phê duyệt.'
                            ),
                          onError: (err: any) =>
                            toast.error(err?.response?.data?.message || err?.message || 'Không thể cập nhật cài đặt.'),
                        }
                      )
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${ group.memberApprovalRequired ? 'bg-emerald-600' : 'bg-muted' }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-card transition-transform ${ group.memberApprovalRequired ? 'translate-x-5' : 'translate-x-0.5' }`}
                    />
                  </button>
                </div>
              )}

              <div className={isAdmin ? 'pt-5 border-t border-border' : ''}>
                {isAdmin ? (
                  <>
                    <p className="font-semibold text-foreground">Giải tán nhóm</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Xóa nhóm vĩnh viễn và gỡ tất cả thành viên. Hành động này không thể hoàn tác.
                    </p>
                    <button
                      onClick={() => { setShowSettings(false); setShowDisbandConfirm(true); }}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                    >
                      Giải tán nhóm
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Rời nhóm</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Bạn sẽ không còn là thành viên của nhóm này.
                    </p>
                    <button
                      onClick={() => { setShowSettings(false); setShowLeaveConfirm(true); }}
                      className="px-4 py-2 rounded-lg bg-muted hover:bg-muted text-foreground text-sm font-semibold transition-colors"
                    >
                      Rời nhóm
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Rời nhóm</h3>
              <p className="text-muted-foreground text-sm">
                Bạn có chắc chắn muốn rời khỏi nhóm <strong className="text-foreground">{group?.name}</strong> không?
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaveGroupMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-background text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  leaveGroupMutation.mutate(groupId!, {
                    onSuccess: () => {
                      toast.success('Bạn đã rời khỏi nhóm');
                      navigate('/groups');
                    },
                    onError: (err: any) => {
                      toast.error(err?.response?.data?.message || err?.message || 'Không thể rời nhóm');
                      setShowLeaveConfirm(false);
                    },
                  });
                }}
                disabled={leaveGroupMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {leaveGroupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {leaveGroupMutation.isPending ? 'Đang xử lý...' : 'Rời nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disband Group Confirmation Modal */}
      {showDisbandConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Giải tán nhóm</h3>
              <p className="text-muted-foreground text-sm">
                Bạn có chắc chắn muốn giải tán nhóm <strong className="text-foreground">{group?.name}</strong> không? Toàn bộ thành viên sẽ bị gỡ và nội dung nhóm sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowDisbandConfirm(false)}
                disabled={disbandGroupMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-background text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  disbandGroupMutation.mutate(groupId!, {
                    onSuccess: () => {
                      toast.success('Đã giải tán nhóm');
                      navigate('/groups');
                    },
                    onError: (err: any) => {
                      toast.error(err?.response?.data?.message || err?.message || 'Không thể giải tán nhóm');
                      setShowDisbandConfirm(false);
                    },
                  });
                }}
                disabled={disbandGroupMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {disbandGroupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {disbandGroupMutation.isPending ? 'Đang xử lý...' : 'Giải tán nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Xóa thành viên</h3>
              <p className="text-muted-foreground text-sm">
                Bạn có chắc chắn muốn xóa <strong className="text-foreground">{removingMember.fullName}</strong> khỏi nhóm không?
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setRemovingMember(null)}
                className="flex-1 py-2.5 rounded-lg bg-background text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  removeMemberMutation.mutate(
                    { groupId: groupId!, userId: removingMember.userId },
                    {
                      onSuccess: () => {
                        toast.success(`Đã xóa ${removingMember.fullName} khỏi nhóm`);
                        setRemovingMember(null);
                      },
                      onError: (err: any) => {
                        toast.error(err?.message || 'Không thể xóa thành viên');
                      },
                    }
                  );
                }}
                disabled={removeMemberMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {removeMemberMutation.isPending ? 'Đang xóa...' : 'Xóa thành viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

