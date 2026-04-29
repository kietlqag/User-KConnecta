import { useState, useRef } from 'react';
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
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type CreatePostMediaRequest } from '@/services/postService';
import { CurrentUserAvatar } from '@/components/shared';
import { ProfilePostAudienceModal } from './ProfilePostAudienceModal';
import { ProfilePostSettingsModal } from './ProfilePostSettingsModal';

interface ProfileCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onPostCreated?: () => void;
  groupId?: string;
}

export function ProfileCreatePostModal({
  isOpen,
  onClose,
  username,
  onPostCreated,
  groupId,
}: ProfileCreatePostModalProps) {
  const [postContent, setPostContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ id: string; file: File; previewUrl: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleNext = () => {
    if (postContent.trim() || selectedImages.length > 0) {
      setShowSettingsModal(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedImages(prev => [...prev, ...newImages]);
    if (e.target) e.target.value = '';
  };

  const removeImage = (id: string) => {
    setSelectedImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
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
    if (!postContent.trim() && selectedImages.length === 0) return;
    setIsPosting(true);
    try {
      // 1. Upload images first
      const uploadedMedia: CreatePostMediaRequest[] = [];
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (img, index) => {
          const response = await postService.uploadPostImage(img.file);
          return {
            mediaType: 'IMAGE' as const,
            fileUrl: response.url,
            sortOrder: index,
          };
        });
        const results = await Promise.all(uploadPromises);
        uploadedMedia.push(...results);
      }

      // 2. Create post
      const user = authService.getCurrentUser();
      await postService.createPost({
        authorId: user?.id || '',
        ...(groupId && { groupId }),
        content: postContent.trim(),
        imageUrl: uploadedMedia.length > 0 ? uploadedMedia[0].fileUrl : undefined,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        privacy: mapPrivacyToApi(),
        status: 'PUBLISHED',
      });
      
      toast.success('Đăng bài thành công');
      onPostCreated?.();
      onClose();
      setPostContent('');
      setSelectedImages([]);
      setShowImagePicker(false);
      setShowSettingsModal(false);
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
              <CurrentUserAvatar />
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
              placeholder="Bạn đang nghĩ gì?"
              className="min-h-[120px] w-full resize-none border-none bg-transparent text-2xl text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
              autoFocus
            />

            {showImagePicker && (
              <div className="relative mb-4 rounded-lg bg-gray-50 border border-gray-200 p-2 group dark:bg-gray-700 dark:border-gray-600">
                <div className="absolute right-2 top-2 z-10 flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  >
                    <Image className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    Thêm ảnh/video
                  </button>
                  <button 
                    onClick={() => setShowImagePicker(false)}
                    className="rounded-full bg-white p-1.5 text-gray-500 shadow-sm hover:bg-gray-50 border border-gray-200 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 dark:border-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedImages.length === 0 ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-transparent hover:bg-gray-100 transition-colors dark:hover:bg-gray-600"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                      <Image className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-[17px] font-bold text-gray-900 dark:text-white">Thêm ảnh/video</p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">hoặc kéo và thả</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-12 pb-2">
                    {selectedImages.map((img) => (
                      <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-500">
                        <img src={img.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                        <button 
                          onClick={() => removeImage(img.id)}
                          className="absolute right-1 top-1 rounded-full bg-white p-1 text-gray-500 shadow-sm hover:bg-gray-50 border border-gray-200 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 dark:border-gray-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-100 transition-colors dark:border-gray-500 dark:hover:bg-gray-600"
                    >
                      <div className="flex flex-col items-center">
                         <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 mb-1">
                            <span className="text-2xl text-gray-600 dark:text-gray-400">+</span>
                         </div>
                         <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Thêm ảnh</span>
                      </div>
                    </button>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*,video/*" 
                  className="hidden" 
                />
              </div>
            )}

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
                  <button 
                    onClick={() => setShowImagePicker(true)}
                    className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
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
              disabled={!postContent.trim() && selectedImages.length === 0}
              className={`w-full rounded-lg py-2.5 font-semibold transition-colors ${
                postContent.trim() || selectedImages.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
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
