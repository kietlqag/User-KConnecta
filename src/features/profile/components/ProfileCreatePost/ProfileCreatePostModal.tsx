import { useState } from 'react';
import {
  X,
  Globe,
  Image,
  Users,
  Smile,
  MapPin,
  Phone,
  MoreHorizontal,
  UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { ProfilePostAudienceModal } from './ProfilePostAudienceModal';
import { ProfilePostSettingsModal } from './ProfilePostSettingsModal';

interface ProfileCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export function ProfileCreatePostModal({
  isOpen,
  onClose,
  username,
}: ProfileCreatePostModalProps) {
  const [postContent, setPostContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (postContent.trim()) {
      setShowSettingsModal(true);
    }
  };

  const mapPrivacyToApi = () => {
    switch (privacy) {
      case 'friends':
        return 'FRIENDS' as const;
      case 'friends-except':
        return 'FRIENDS_EXCEPT' as const;
      case 'private':
        return 'PRIVATE' as const;
      default:
        return 'PUBLIC' as const;
    }
  };

  const handlePost = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để đăng bài');
      return;
    }

    if (!postContent.trim()) {
      toast.error('Nội dung bài viết không được để trống');
      return;
    }

    setIsPosting(true);
    try {
      await postService.createPost({
        authorId: currentUser.id,
        content: postContent.trim(),
        privacy: mapPrivacyToApi(),
        status: 'PUBLISHED',
      });

      toast.success('Đăng bài thành công');
      setPostContent('');
      setShowSettingsModal(false);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đăng bài');
    } finally {
      setIsPosting(false);
    }
  };

  const getPrivacyInfo = () => {
    switch (privacy) {
      case 'public':
        return { icon: Globe, label: 'Công khai' };
      case 'friends':
        return { icon: Users, label: 'Bạn bè' };
      case 'friends-except':
        return { icon: UserMinus, label: 'Bạn bè ngoại trừ...' };
      default:
        return { icon: Globe, label: 'Công khai' };
    }
  };

  const privacyInfo = getPrivacyInfo();
  const PrivacyIcon = privacyInfo.icon;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div className="sticky top-0 relative flex items-center justify-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tạo bài viết</h2>
            <button
              onClick={onClose}
              className="absolute right-4 rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
                <span className="text-sm font-semibold text-white">QK</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{username}</h3>
                <button
                  onClick={() => setShowAudienceModal(true)}
                  className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <PrivacyIcon className="h-3 w-3" />
                  <span>{privacyInfo.label}</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`Bạn đang nghĩ gì, ${username}?`}
              className="min-h-[120px] w-full resize-none border-none bg-transparent text-2xl text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
              autoFocus
            />

            <div className="mt-2 flex items-center justify-between">
              <button className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-600">
                  <span className="text-sm font-bold text-white">Aa</span>
                </div>
              </button>
              <button className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <Smile className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-lg border border-gray-300 p-3 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Thêm vào bài viết của bạn
                </span>
                <div className="flex items-center gap-1">
                  <button className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Image className="h-6 w-6 text-green-500" />
                  </button>
                  <button className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Users className="h-6 w-6 text-emerald-500" />
                  </button>
                  <button className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Smile className="h-6 w-6 text-yellow-500" />
                  </button>
                  <button className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                    <MapPin className="h-6 w-6 text-red-500" />
                  </button>
                  <button className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Phone className="h-6 w-6 text-emerald-500" />
                  </button>
                  <button className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                    <MoreHorizontal className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={handleNext}
              disabled={!postContent.trim()}
              className={`w-full rounded-lg py-2.5 font-semibold transition-colors ${
                postContent.trim()
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              }`}
            >
              Tiếp
            </button>
          </div>
        </div>
      </div>

      <ProfilePostAudienceModal
        isOpen={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        selectedAudience={privacy}
        onSelect={setPrivacy}
      />

      <ProfilePostSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onPost={handlePost}
        postContent={postContent}
        privacy={privacy}
        isPosting={isPosting}
      />
    </>
  );
}
