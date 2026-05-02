import React, { useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../home/components/Header';
import { GroupsLeftSidebar, GroupFeed, InviteFriendsModal } from '../components';
import { PenTool, Edit3, MoreHorizontal, Lock, Users, Smile, Image as ImageIcon, Briefcase, EyeOff, X, Globe2, Search, Shield, UserMinus, AlertTriangle } from 'lucide-react';
import { useGroupById, useJoinedGroups, useManagedGroups, useJoinGroup, useGroupMembers, useRemoveMember } from '../hooks/useGroups';
import { groupService } from '@/services/groupService';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

const UserAvatar = ({
  avatarUrl,
  name,
  className = '',
}: {
  avatarUrl?: string | null;
  name?: string | null;
  className?: string;
}) => {
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        className={`rounded-full object-cover ${className}`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div className={`rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 ${className}`}>
      {initials}
    </div>
  );
};

export const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const currentUser = authService.getCurrentUser();
  const { data: group } = useGroupById(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: managedGroups = [] } = useManagedGroups();
  const { data: joinedGroups = [] } = useJoinedGroups();
  const [activeTab, setActiveTab] = useState('Thảo luận');
  const joinGroupMutation = useJoinGroup();

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCoverMenu, setShowCoverMenu] = useState(false);

  const [coverError, setCoverError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [removingMember, setRemovingMember] = useState<{ userId: string; fullName: string } | null>(null);
  const navigate = useNavigate();
  const removeMemberMutation = useRemoveMember();
  const isAdmin = group?.role === 'ADMIN';

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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      
      <div className="flex flex-1 pt-14 h-full">
        {/* Left Sidebar */}
        <div className="sticky top-14 h-[calc(100vh-56px)] shrink-0 z-10 w-[360px]">
          <GroupsLeftSidebar joinedGroups={joinedGroups} managedGroups={managedGroups} />
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full max-w-full">
          <div className="bg-white px-0 lg:px-8 xl:px-16 shadow-sm border-b border-gray-200">
            <div className="max-w-[1050px] mx-auto">
              {/* Banner */}
              <div className="relative w-full h-[250px] md:h-[350px] lg:h-[400px] mt-0 rounded-b-lg overflow-hidden bg-[#fdf0e6]">
                {previewUrl || group?.icon ? (
                  <img
                    src={previewUrl ?? group!.icon}
                    alt="Ảnh bìa nhóm"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-orange-500 to-red-500 opacity-90" />
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
                      <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur" />
                      <div className="w-32 h-32 bg-yellow-400/30 rotate-12" />
                      <div className="w-40 h-40 rounded-full bg-blue-500/20 backdrop-blur" />
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

                {/* Bottom-right controls */}
                {previewUrl ? (
                  <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex gap-2">
                    <button
                      onClick={cancelPreview}
                      className="bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => selectedFile && uploadCoverMutation.mutate(selectedFile)}
                      disabled={uploadCoverMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors"
                    >
                      {uploadCoverMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                ) : (
                  <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
                    <button
                      onClick={() => setShowCoverMenu(v => !v)}
                      className="bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                    {showCoverMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowCoverMenu(false)} />
                        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1 min-w-[220px]">
                          <button
                            onClick={() => { fileInputRef.current?.click(); setShowCoverMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-gray-900 font-medium text-[15px] text-left"
                          >
                            <ImageIcon className="w-5 h-5 text-gray-600 shrink-0" />
                            Tải ảnh bìa lên
                          </button>
                          {group?.icon && (
                            <button
                              onClick={() => { removeCoverMutation.mutate(); setShowCoverMenu(false); }}
                              disabled={removeCoverMutation.isPending}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-gray-900 font-medium text-[15px] text-left disabled:opacity-50"
                            >
                              <X className="w-5 h-5 text-gray-600 shrink-0" />
                              Xóa ảnh bìa
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cover photo error */}
              {coverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 flex items-center justify-between">
                  <span>{coverError}</span>
                  <button onClick={() => setCoverError(null)} className="ml-4 text-red-500 hover:text-red-700 font-bold">✕</button>
                </div>
              )}

              {/* Group Header Info */}
              <div className="px-4 pt-6 pb-2">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{group?.name}</h1>
                <div className="flex items-center text-[15px] text-gray-500 gap-1.5 font-medium mb-4">
                  {group?.privacy === 'private' ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  <span>Nhóm {group?.privacy === 'private' ? 'Riêng tư' : 'Công khai'}</span>
                  <span>·</span>
                  <span className="font-semibold text-gray-900">{group?.members ?? 0} thành viên</span>
                </div>
                
                {/* Action buttons row */}
                <div className="flex flex-wrap items-center justify-between border-b border-gray-300 pb-4">
                  {/* Avatars */}
                  <div className="flex items-center mb-2 sm:mb-0">
                    <div className="flex -space-x-2 overflow-hidden">
                      {members.slice(0, 8).map((member) => (
                        <UserAvatar
                          key={member.id}
                          avatarUrl={member.avatarUrl}
                          name={member.fullName}
                          className="w-10 h-10 border-2 border-white inline-block ring-2 ring-white"
                        />
                      ))}
                      {members.length > 8 && (
                        <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-semibold ring-2 ring-white">
                          +{members.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    {!group?.role ? (
                      <button
                        onClick={() => {
                          joinGroupMutation.mutate(groupId!, {
                            onSuccess: () => {
                              toast.success('Đã tham gia nhóm thành công!');
                              queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
                            },
                            onError: (err: any) => {
                              toast.error(err?.response?.data?.message || 'Không thể tham gia nhóm. Vui lòng thử lại.');
                            }
                          });
                        }}
                        disabled={joinGroupMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {joinGroupMutation.isPending ? 'Đang xử lý...' : 'Tham gia nhóm'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span className="text-xl leading-none -mt-0.5">+</span> Mời
                      </button>
                    )}
                    <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
                      Chia sẻ
                    </button>
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
                  {['Thảo luận', 'Thành viên', 'Sự kiện', 'File phương tiện', 'File'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-3.5 font-semibold text-[15px] whitespace-nowrap transition-colors ${
                        activeTab === tab 
                          ? 'text-blue-600 border-b-[3px] border-blue-600 rounded-t' 
                          : 'text-gray-500 hover:bg-gray-100 rounded-lg h-11 my-1 flex items-center'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Layout Area */}
          <div className="max-w-[1050px] mx-auto px-4 py-4 lg:py-6 flex flex-col md:flex-row gap-6">
             {/* Left Column (Posts Flow / Members Tab) */}
             <div className="flex-1 min-w-0">
               {activeTab === 'Thành viên' ? (
                 /* ===== Members Management Panel ===== */
                 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                   {/* Header */}
                   <div className="p-4 border-b border-gray-200">
                     <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl font-bold text-gray-900">Thành viên · {members.length}</h2>
                       {isAdmin && (
                         <button
                           onClick={() => setIsInviteModalOpen(true)}
                           className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                         >
                           <span className="text-lg leading-none">+</span> Mời thành viên
                         </button>
                       )}
                     </div>
                     {/* Search */}
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input
                         type="text"
                         placeholder="Tìm kiếm thành viên"
                         value={memberSearch}
                         onChange={(e) => setMemberSearch(e.target.value)}
                         className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                       />
                     </div>
                   </div>

                   {/* Admin section */}
                   {adminMembers.length > 0 && (
                     <div className="p-4 border-b border-gray-100">
                       <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quản trị viên · {adminMembers.length}</h3>
                       <div className="space-y-1">
                         {adminMembers.map(member => (
                           <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                             <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${member.userId}`)}>
                               <UserAvatar avatarUrl={member.avatarUrl} name={member.fullName} className="w-12 h-12" />
                               <div>
                                 <div className="font-semibold text-gray-900 text-[15px] group-hover:underline">{member.fullName}</div>
                                 <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                                   <Shield className="w-3 h-3" /> Quản trị viên
                                 </div>
                               </div>
                             </div>
                             <button className="p-2 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                               <MoreHorizontal className="w-5 h-5 text-gray-500" />
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Regular members section */}
                   <div className="p-4">
                     <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Thành viên · {regularMembers.length}</h3>
                     {regularMembers.length === 0 ? (
                       <p className="text-gray-400 text-sm py-4 text-center">
                         {memberSearch ? 'Không tìm thấy thành viên nào.' : 'Chưa có thành viên nào.'}
                       </p>
                     ) : (
                       <div className="space-y-1">
                         {regularMembers.map(member => (
                           <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                             <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${member.userId}`)}>
                               <UserAvatar avatarUrl={member.avatarUrl} name={member.fullName} className="w-12 h-12" />
                               <div>
                                 <div className="font-semibold text-gray-900 text-[15px] group-hover:underline">{member.fullName}</div>
                                 <div className="text-xs text-gray-500">Thành viên</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-1">
                               {isAdmin && (
                                 <button
                                   onClick={() => setRemovingMember({ userId: member.userId, fullName: member.fullName })}
                                   className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                   title="Xóa khỏi nhóm"
                                 >
                                   <UserMinus className="w-5 h-5" />
                                 </button>
                               )}
                               <button className="p-2 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                 <MoreHorizontal className="w-5 h-5 text-gray-500" />
                               </button>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>
               ) : (
                 groupId && <GroupFeed groupId={groupId} />
               )}
             </div>

             {/* Right Column (Widgets) */}
             <div className="w-full md:w-[360px] shrink-0 flex flex-col gap-4">
               {/* Setup Tracker */}
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 pb-2">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="font-semibold text-gray-900 text-[17px] leading-tight">Hãy hoàn tất quy trình thiết lập nhóm</h3>
                     <p className="text-[13px] font-semibold text-gray-900 mt-1">Đã hoàn thành <span className="text-green-600">0/4</span> bước</p>
                     <p className="text-[13px] text-gray-500 leading-snug mt-1.5">Tiếp tục thêm các thông tin chính và bắt đầu tương tác với cộng đồng của bạn.</p>
                   </div>
                   <button className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                 </div>
                 
                 <div className="mt-4 space-y-1">
                   {[
                     { icon: Users, label: 'Mời mọi người tham gia', onClick: undefined },
                     { icon: ImageIcon, label: 'Thêm ảnh bìa', onClick: () => fileInputRef.current?.click() },
                     { icon: Edit3, label: 'Thêm phần mô tả', onClick: undefined },
                     { icon: PenTool, label: 'Tạo bài viết', onClick: undefined },
                   ].map((step, idx) => (
                     <button key={idx} onClick={step.onClick} className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors group">
                       <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                         <step.icon className="w-4 h-4 text-gray-700" />
                       </div>
                       <span className="font-semibold text-gray-900 text-[15px]">{step.label}</span>
                     </button>
                   ))}
                 </div>
               </div>

               {/* About Widget */}
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                 <h3 className="font-semibold text-[17px] text-gray-900 mb-4">Giới thiệu</h3>
                 <div className="flex gap-3 mb-4">
                   <div className="mt-0.5 shrink-0"><Lock className="w-5 h-5 text-gray-900" /></div>
                   <div>
                     <div className="font-semibold text-gray-900 text-[15px]">Riêng tư</div>
                     <div className="text-[15px] text-gray-500 leading-snug">Chỉ thành viên mới nhìn thấy mọi người trong nhóm và những gì họ đăng.</div>
                   </div>
                 </div>
                 <div className="flex gap-3 mb-5">
                   <div className="mt-0.5 shrink-0"><EyeOff className="w-5 h-5 text-gray-900" /></div>
                   <div>
                     <div className="font-semibold text-gray-900 text-[15px]">Ẩn</div>
                     <div className="text-[15px] text-gray-500 leading-snug">Chỉ thành viên mới tìm thấy nhóm này.</div>
                   </div>
                 </div>
                 
                 <button className="w-full py-2 bg-gray-200 hover:bg-gray-300 transition-colors rounded-lg font-semibold text-gray-900 text-[15px]">
                   Tìm hiểu thêm về nhóm này
                 </button>
               </div>
             </div>
          </div>
        </main>
      </div>

      {groupId && (
        <InviteFriendsModal 
          groupId={groupId}
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          existingMemberIds={members.map(m => m.userId)}
        />
      )}

      {/* Remove Member Confirmation Modal */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Xóa thành viên</h3>
              <p className="text-gray-500 text-sm">
                Bạn có chắc chắn muốn xóa <strong className="text-gray-900">{removingMember.fullName}</strong> khỏi nhóm không?
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setRemovingMember(null)}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
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

