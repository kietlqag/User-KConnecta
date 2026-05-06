import * as React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { authService, type AuthUser } from '@/services/authService';
import { postService, type PostResponse, type ReactionType } from '@/services/postService';
import { Header } from '../../home/components/Header';
import { friendService } from '@/services/friendService';
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
import { mapApiPost, type FeedPost } from '@/utils/postUtils';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

export function ProfilePage() {
  const { userId: routeUserId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightPostId = searchParams.get('post');
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);
  
  // Sanitize userId: Avoid 'undefined' string and fallback to current user
  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') {
      return currentUser?.id || '';
    }
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const isOwnProfile = currentUser?.id === userId;
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<AuthUser | null>(null);
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [friends, setFriends] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchProfilePosts = React.useCallback(
    async (profileData?: AuthUser | null) => {
      try {
        const targetAuthorId = profileData?.id || userId;
        
        // Safety check: Don't fetch if ID is invalid or 'undefined'
        if (!targetAuthorId || targetAuthorId === 'undefined' || targetAuthorId === '') {
          console.warn('Invalid authorId detected, skipping fetchProfilePosts');
          return;
        }

        const profilePostsResponse = await postService.getAllPosts(currentUser?.id, targetAuthorId);

        const profilePosts = profilePostsResponse.content
          .sort((left, right) => {
            const leftTime = new Date(left.publishedAt || left.createdAt).getTime();
            const rightTime = new Date(right.publishedAt || right.createdAt).getTime();
            return rightTime - leftTime;
          })
          .map((post) => mapApiPost(post));

        setPosts(profilePosts);
      } catch (error) {
        console.error('Error fetching profile posts:', error);
        setPosts([]);
      }
    },
    [userId, currentUser?.id],
  );

  React.useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!userId || userId === 'undefined' || userId === '') {
        setLoading(false);
        return;
      }
      try {
        const [userResponse, friendsResponse] = await Promise.all([
          authService.getUserById(userId),
          friendService.getFriends(userId)
        ]);

        if (!isMounted) return;
        
        setProfile(userResponse);
        
        const mappedFriends = friendsResponse.map(f => ({
          id: f.userId,
          name: f.fullName,
          avatar: f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName)}&background=random`
        }));
        setFriends(mappedFriends);

        await fetchProfilePosts(userResponse);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        if (!isMounted) return;

        if (isOwnProfile && currentUser) {
          setProfile(currentUser);
          await fetchProfilePosts(currentUser);
        } else {
          setPosts([]);
          setFriends([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, [fetchProfilePosts, isOwnProfile, userId, currentUser?.id]);

  React.useEffect(() => {
    if (highlightPostId && posts.length > 0) {
      // Delay slightly to ensure elements are rendered
      const timer = setTimeout(() => {
        const element = document.getElementById(`post-${highlightPostId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-lg');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightPostId, posts]);

  const handleAvatarUpload = async (file: File) => {
    if (!currentUser) return;
    const updatedUser = await authService.uploadAvatar(currentUser.id, file);
    authService.saveCurrentUser(updatedUser);
    setProfile(updatedUser);
  };

  const handleCoverUpload = async (file: File) => {
    if (!currentUser) return;
    const updatedUser = await authService.uploadCoverPhoto(currentUser.id, file);
    authService.saveCurrentUser(updatedUser);
    setProfile(updatedUser);
  };

  const userProfile = {
    id: profile?.id || userId,
    fullName: profile?.fullName || 'Quốc Kiệt',
    username: profile?.username || currentUser?.username || '',
    avatar: profile?.avatarUrl || DEFAULT_AVATAR,
    coverPhoto: profile?.coverPhotoUrl || DEFAULT_COVER,
    friendsCount: friends.length,
    location: profile?.location || 'Thành phố Hồ Chí Minh',
    school: profile?.school || 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
    hometown: profile?.hometown || 'Tịnh An, An Giang, Vietnam',
    relationship: profile?.relationshipStatus || 'Độc thân',
    bio: profile?.bio || 'Mô tả ngắn về bản thân bạn',
    dateOfBirth: profile?.dateOfBirth,
  };

  const profilePhotos = React.useMemo(() => {
    return posts.flatMap(post => 
      (post.mediaList || [])
        .filter(m => m.type === 'IMAGE')
        .map(m => ({ id: `${post.id}-${Math.random()}`, url: m.url }))
    );
  }, [posts]);

  const featuredPhotos = profilePhotos.slice(0, 3);
  const photos = profilePhotos.slice(0, 9);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

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
          onAvatarUpload={isOwnProfile ? handleAvatarUpload : undefined}
          onCoverUpload={isOwnProfile ? handleCoverUpload : undefined}
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
