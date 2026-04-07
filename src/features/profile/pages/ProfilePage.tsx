import * as React from 'react';
import { useParams } from 'react-router-dom';
import { authService, type AuthUser } from '@/services/authService';
import { postService, type PostResponse, type ReactionType } from '@/services/postService';
import { Header } from '../../home/components/Header';
import {
  EditProfileDialog,
  FriendsPreview,
  PhotosPreview,
  ProfileCreatePost,
  ProfileHeader,
  ProfileIntro,
  ProfilePosts,
  ProfileTabs,
} from '../components';

interface ProfileFeedPost {
  id: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  currentUserReactionType?: ReactionType | null;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

function normalizeId(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function formatPostTimestamp(dateString?: string | null) {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function mapPostToProfileFeed(post: PostResponse, avatarUrl: string): ProfileFeedPost {
  const firstImage = (post.media ?? []).find((item) => item.mediaType === 'IMAGE');

  return {
    id: post.id,
    userName: post.authorFullName,
    userAvatar: avatarUrl,
    timestamp: formatPostTimestamp(post.publishedAt || post.createdAt),
    content: post.content,
    image: firstImage?.mediaUrl,
    likes: post.reactionCount,
    comments: post.commentCount,
    shares: post.shareCount,
    isLiked: !!post.currentUserReactionType,
    currentUserReactionType: post.currentUserReactionType,
  };
}

export function ProfilePage() {
  const { userId: routeUserId } = useParams();
  const currentUser = authService.getCurrentUser();
  const userId = routeUserId || currentUser?.id || '';
  const isOwnProfile = currentUser?.id === userId;
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<AuthUser | null>(null);
  const [posts, setPosts] = React.useState<ProfileFeedPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchProfilePosts = React.useCallback(
    async (profileData?: AuthUser | null) => {
      try {
        const allPosts = await postService.getAllPosts(currentUser?.id);
        const targetAuthorId = normalizeId(profileData?.id || userId);

        const profilePosts = allPosts
          .filter((post) => normalizeId(post.authorId) === targetAuthorId)
          .sort((left, right) => {
            const leftTime = new Date(left.publishedAt || left.createdAt).getTime();
            const rightTime = new Date(right.publishedAt || right.createdAt).getTime();
            return rightTime - leftTime;
          })
          .map((post) => mapPostToProfileFeed(post, profileData?.avatarUrl || DEFAULT_AVATAR));

        setPosts(profilePosts);
      } catch (error) {
        console.error('Error fetching profile posts:', error);
        setPosts([]);
      }
    },
    [userId],
  );

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authService.getUserById(userId);
        setProfile(response);

        if (isOwnProfile) {
          authService.saveCurrentUser(response);
        }

        await fetchProfilePosts(response);
      } catch (error) {
        console.error('Error fetching profile:', error);

        if (isOwnProfile && currentUser) {
          setProfile(currentUser);
          await fetchProfilePosts(currentUser);
        } else {
          setPosts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, fetchProfilePosts, isOwnProfile, userId]);

  const userProfile = {
    id: profile?.id || userId,
    fullName: profile?.fullName || 'Quốc Kiệt',
    username: profile?.username || currentUser?.username || '',
    avatar: profile?.avatarUrl || DEFAULT_AVATAR,
    coverPhoto: profile?.coverPhotoUrl || DEFAULT_COVER,
    friendsCount: 253,
    location: profile?.location || 'Thành phố Hồ Chí Minh',
    school: profile?.school || 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
    hometown: profile?.hometown || 'Tịnh An, An Giang, Vietnam',
    relationship: profile?.relationshipStatus || 'Độc thân',
    bio: profile?.bio || 'Mô tả ngắn về bản thân bạn',
    dateOfBirth: profile?.dateOfBirth,
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  const featuredPhotos = [
    { id: '1', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400', count: 1 },
    { id: '2', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' },
    { id: '3', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400' },
  ];

  const friends = [
    { id: '1', name: 'Lê Lộc', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: '2', name: 'Ngọc Tuyền', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    { id: '3', name: 'Đặng Thị Thúy An', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: '4', name: 'Dương Trần Thái Duy', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { id: '5', name: 'Ngô Gia Hân', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
    { id: '6', name: 'Nguyễn Chí Tài', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
    { id: '7', name: 'Cẩm Liên', avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150' },
    { id: '8', name: 'Phạm Gia Huy', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150' },
    { id: '9', name: 'Hoàng Phi', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150' },
  ];

  const photos = [
    { id: '1', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400' },
    { id: '2', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400' },
    { id: '3', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' },
    { id: '4', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400' },
    { id: '5', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400' },
    { id: '6', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400' },
    { id: '7', url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400' },
    { id: '8', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=400' },
    { id: '9', url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400' },
    { id: '10', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400' },
    { id: '11', url: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=400' },
    { id: '12', url: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=400' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />

      <div className="pt-14">
        <ProfileHeader
          coverPhoto={userProfile.coverPhoto}
          avatar={userProfile.avatar}
          fullName={userProfile.fullName}
          username={userProfile.username}
          friendsCount={userProfile.friendsCount}
          location={userProfile.location}
          school={userProfile.school}
          isOwnProfile={isOwnProfile}
          onEditClick={() => setIsEditDialogOpen(true)}
        />

        <ProfileTabs userId={userProfile.id} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1320px] mx-auto px-4 py-4 lg:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.55fr)] gap-4 lg:gap-6 items-start">
            <div className="space-y-4 order-2 lg:order-1 lg:sticky lg:top-[136px]">
              <ProfileIntro
                bio={userProfile.bio}
                location={userProfile.location}
                hometown={userProfile.hometown}
                relationship={userProfile.relationship}
                school={userProfile.school}
                featuredPhotos={featuredPhotos}
                isOwnProfile={isOwnProfile}
                onEditClick={() => setIsEditDialogOpen(true)}
              />

              <FriendsPreview
                userId={userProfile.id}
                friendsCount={userProfile.friendsCount}
                friends={friends}
              />

              <PhotosPreview userId={userProfile.id} photos={photos} />
            </div>

            <div className="space-y-4 order-1 lg:order-2">
              <ProfileCreatePost
                username={userProfile.fullName}
                onPostCreated={() => fetchProfilePosts(profile || currentUser)}
              />
              <ProfilePosts posts={posts} />
            </div>
          </div>
        </div>
      </div>

      <EditProfileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={{
          fullName: userProfile.fullName,
          location: userProfile.location,
          hometown: userProfile.hometown,
          school: userProfile.school,
          relationship: userProfile.relationship,
          bio: userProfile.bio,
          dateOfBirth: userProfile.dateOfBirth,
          avatarUrl: userProfile.avatar,
          coverPhotoUrl: userProfile.coverPhoto,
        }}
      />
    </div>
  );
}
