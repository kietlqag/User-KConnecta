import React, { useState } from 'react';
import { X, Globe2, Lock, Image as ImageIcon, Users, Smile, Monitor, Smartphone, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '@/services/groupService';
import { authService } from '@/services/authService';

export const CreateGroupPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();
  const [groupName, setGroupName] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const createGroupMutation = useMutation({
    mutationFn: () =>
      groupService.createGroup({
        creatorId: currentUser!.id,
        name: groupName.trim(),
        privacy: privacy === 'public' ? 'PUBLIC' : 'PRIVATE',
      }),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'managed'] });
      navigate(`/groups/${newGroup.id}`);
    },
  });

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-[360px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shrink-0 shadow-sm dark:shadow-none z-10">
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/groups')}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 hover:underline cursor-pointer" onClick={() => navigate('/groups')}>Nhóm &gt; Tạo nhóm</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">Tạo nhóm</h1>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden shrink-0">
              <img src="https://i.pravatar.cc/150?u=1" alt="User Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 text-[15px]">Khang Nguyen</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">Quản trị viên</div>
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
                  className="peer w-full px-3 pt-5 pb-2 border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-transparent"
                />
                <label className="absolute left-3 top-3.5 text-gray-500 dark:text-gray-400 text-[15px] pointer-events-none transition-all peer-placeholder-shown:text-[15px] peer-placeholder-shown:top-3.5 peer-focus:top-1 peer-focus:text-[11px] peer-focus:text-blue-500 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[11px]">
                  Tên nhóm
                </label>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-md transition-colors ${
                  isPrivacyOpen ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm dark:shadow-none' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {privacy === 'public' ? (
                      <Globe2 className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    )}
                  </div>
                  <div className="text-left flex flex-col justify-center">
                    <span className={`text-[12px] font-medium leading-tight ${isPrivacyOpen ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>
                      Chọn quyền riêng tư
                    </span>
                    <span className="text-[17px] text-gray-900 dark:text-gray-100">
                      {privacy === 'public' ? 'Công khai' : 'Riêng tư'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${isPrivacyOpen ? 'text-blue-600 rotate-180' : 'text-gray-700 dark:text-gray-300'}`} />
              </button>

              {isPrivacyOpen && (
                <>
                  {/* Invisible overlay for closing dropdown when clicking outside */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsPrivacyOpen(false)} />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute left-[-8px] right-[-8px] top-[105%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-50 p-2 space-y-1">
                    {/* Public Option */}
                    <div 
                      className={`flex items-start gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors ${privacy === 'public' ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                      onClick={() => { setPrivacy('public'); setIsPrivacyOpen(false); }}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-1">
                        <Globe2 className="w-6 h-6 text-gray-900 dark:text-gray-100" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Công khai</div>
                        <div className="text-[14px] text-gray-700 dark:text-gray-300 mb-1 leading-snug">
                          Bất kỳ ai cũng có thể nhìn thấy mọi người trong nhóm và những gì họ đăng.
                        </div>
                        <div className="text-[13px] te
                        xt-gray-500 leading-snug">
                          Tùy theo quy mô và độ tuổi của nhóm, bạn có thể chuyển sang chế độ riêng tư vào lúc khác.
                        </div>
                      </div>
                      <div className="shrink-0 pt-2 flex items-center">
                        <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center transition-colors ${privacy === 'public' ? 'border-blue-600' : 'border-gray-400'}`}>
                          {privacy === 'public' && <div className="w-3 h-3 rounded-full bg-blue-600" />}
                        </div>
                      </div>
                    </div>

                    {/* Private Option */}
                    <div 
                      className={`flex items-start gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors ${privacy === 'private' ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                      onClick={() => { setPrivacy('private'); setIsPrivacyOpen(false); }}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-1">
                        <Lock className="w-6 h-6 text-gray-900 dark:text-gray-100" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Riêng tư</div>
                        <div className="text-[14px] text-gray-700 dark:text-gray-300 mb-1 leading-snug">
                          Chỉ thành viên mới nhìn thấy mọi người trong nhóm và những gì họ đăng.
                        </div>
                        <div className="text-[13px] text-gray-500 dark:text-gray-400 leading-snug">
                          Bạn có thể chuyển sang chế độ công khai vào lúc khác.
                        </div>
                      </div>
                      <div className="shrink-0 pt-2 flex items-center">
                        <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center transition-colors ${privacy === 'private' ? 'border-blue-600' : 'border-gray-400'}`}>
                          {privacy === 'private' && <div className="w-3 h-3 rounded-full bg-blue-600" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <input
                type="text"
                placeholder="Mời bạn bè (không bắt buộc)"
                className="w-full px-3 py-3.5 border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-[15px]"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Gợi ý: <span className="text-blue-600 cursor-pointer">Hoàng Ngọc Lam</span>, <span className="text-blue-600 cursor-pointer">Hán Dì Diệu</span>, <span className="text-blue-600 cursor-pointer">Cự Depression</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => createGroupMutation.mutate()}
            className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${
              groupName.trim() && !createGroupMutation.isPending
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!groupName.trim() || createGroupMutation.isPending}
          >
            {createGroupMutation.isPending ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-background flex flex-col items-center py-6 px-4">
        <div className={`w-full transition-all duration-300 ${previewMode === 'desktop' ? 'max-w-[1020px]' : 'max-w-[400px]'}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-[15px]">Xem trước trên {previewMode === 'desktop' ? 'máy tính' : 'điện thoại'}</span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white dark:bg-gray-800 shadow-sm dark:shadow-none text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300'}`}
                >
                  <Monitor className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white dark:bg-gray-800 shadow-sm dark:shadow-none text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300'}`}
                >
                  <Smartphone className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="bg-white dark:bg-gray-800 rounded-b-lg overflow-hidden border border-gray-300 dark:border-gray-700 m-4">
              {/* Cover Photo */}
              <div className="h-[350px] bg-gray-200 dark:bg-gray-700 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
                {/* SVG Illustration Placeholder instead of image to make it fast and reliable */}
                <svg className="w-full h-full text-gray-300" viewBox="0 0 800 400" fill="currentColor">
                  <rect width="800" height="400" fill="#E5E7EB"/>
                  <path d="M0,400 L800,400 L800,300 C700,280 600,320 500,280 C400,240 300,300 200,260 C100,220 50,280 0,300 Z" fill="#D1D5DB"/>
                  <circle cx="650" cy="150" r="40" fill="#D1D5DB"/>
                  <path d="M200,350 L300,100 L400,350 Z" fill="#9CA3AF" opacity="0.5"/>
                  <path d="M350,350 L450,150 L550,350 Z" fill="#9CA3AF" opacity="0.3"/>
                </svg>
              </div>

              {/* Group Info */}
              <div className="px-8 pb-4 pt-6">
                <h2 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {groupName || 'Tên nhóm'}
                </h2>
                <div className="flex items-center text-[15px] text-gray-500 dark:text-gray-400 gap-1.5 font-medium">
                  {privacy === 'public' ? <Globe2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Nhóm {privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                  <span>·</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">1 thành viên</span>
                </div>
              </div>

              <div className="px-8">
                <div className="border-t border-gray-300 dark:border-gray-700 my-1" />
              </div>

              {/* Tabs */}
              <div className="flex items-center px-8 gap-1 pb-1">
                {['Giới thiệu', 'Bài viết', 'Thành viên', 'Sự kiện'].map((tab, idx) => (
                  <div key={idx} className={`px-4 py-3.5 font-medium text-[15px] cursor-not-allowed ${idx === 0 ? 'text-blue-600 border-b-[3px] border-blue-600 rounded-t' : 'text-gray-500 dark:text-gray-400'}`}>
                    {tab}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Content Area - Gray background */}
            <div className="bg-gray-100 dark:bg-gray-900 p-4">
               <div className="flex gap-4">
                 {/* Main Column */}
                 <div className="flex-1">
                   {/* Create Post Card */}
                   <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none p-4 mb-4">
                     <div className="flex gap-2 items-center mb-3">
                       <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-100 dark:border-gray-800" />
                       <div className="flex-1 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-not-allowed rounded-full py-2.5 px-4 text-gray-500 dark:text-gray-400 text-[15px]">
                         Bạn đang nghĩ gì?
                       </div>
                     </div>
                     <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex">
                       <div className="flex-1 flex justify-center items-center gap-2 py-2 hover:bg-muted rounded-lg cursor-not-allowed text-gray-500 dark:text-gray-400 font-semibold text-[15px]">
                         <ImageIcon className="w-6 h-6 text-green-500" />
                         Ảnh/video
                       </div>
                       <div className="flex-1 flex justify-center items-center gap-2 py-2 hover:bg-muted rounded-lg cursor-not-allowed text-gray-500 dark:text-gray-400 font-semibold text-[15px]">
                         <Users className="w-6 h-6 text-blue-500" />
                         Gắn thẻ người khác
                       </div>
                       <div className="flex-1 flex justify-center items-center gap-2 py-2 hover:bg-muted rounded-lg cursor-not-allowed text-gray-500 dark:text-gray-400 font-semibold text-[15px]">
                         <Smile className="w-6 h-6 text-yellow-500" />
                         Cảm xúc/Hoạt động
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Right Column (Sidebar) - Hidden on mobile preview */}
                 {previewMode === 'desktop' && (
                   <div className="w-[360px] shrink-0">
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none p-4">
                       <h3 className="font-semibold text-[17px] text-gray-900 dark:text-gray-100 mb-2">Giới thiệu</h3>
                       <p className="text-[15px] text-gray-500 dark:text-gray-400">Người lạ có thể thấy nội dung nhóm của bạn.</p>
                       <div className="flex items-center gap-2 mt-4 text-[15px]">
                         {privacy === 'public' ? <Globe2 className="w-5 h-5 text-gray-400" /> : <Lock className="w-5 h-5 text-gray-400" />}
                         <div>
                           <div className="font-semibold text-gray-900 dark:text-gray-100">{privacy === 'public' ? 'Công khai' : 'Riêng tư'}</div>
                           <div className="text-gray-500 dark:text-gray-400">{privacy === 'public' ? 'Bất kỳ ai cũng có thể nhìn thấy mọi người trong nhóm và những gì họ đăng.' : 'Chỉ thành viên mới có thể nhìn thấy mọi người trong nhóm và những gì họ đăng.'}</div>
                         </div>
                       </div>
                     </div>
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
