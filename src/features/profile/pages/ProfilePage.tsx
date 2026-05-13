import * as React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authService, type AuthUser } from '@/services/authService';
import { postService, type PostResponse, type ReactionType } from '@/services/postService';
import { Header } from '../../home/components/Header';
import { friendService, type FriendshipStatusResponse } from '@/services/friendService';
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
  const navigate = useNavigate();
  const location = useLocation();
  const highlightPostId = searchParams.get('post');
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);
  
  // Sanitize userId: Avoid 'undefined' string and fallback to current user
  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') {
      return currentUser?.id || '';
    }
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const [resolvedProfileId, setResolvedProfileId] = React.useState('');
  const isRouteCurrentUser =
    !!currentUser && (userId === currentUser.id || userId === currentUser.username);
  const isOwnProfile = isRouteCurrentUser || (!!currentUser?.id && currentUser.id === resolvedProfileId);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<AuthUser | null>(null);
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [friends, setFriends] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [friendshipStatus, setFriendshipStatus] = React.useState<FriendshipStatusResponse | null>(null);
  const [postsPage, setPostsPage] = React.useState(0);
  const [hasMorePosts, setHasMorePosts] = React.useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = React.useState(false);

  const PAGE_SIZE = 10;

  const fetchProfilePosts = React.useCallback(
    async (profileData?: AuthUser | null) => {
      try {
        const targetAuthorId = profileData?.id || userId;
        if (!targetAuthorId || targetAuthorId === 'undefined' || targetAuthorId === '') {
          console.warn('Invalid authorId detected, skipping fetchProfilePosts');
          return;
        }

        const res = await postService.getAllPosts(currentUser?.id, targetAuthorId, 0, PAGE_SIZE);
        const mapped = res.content
          .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
          .map(mapApiPost);

        setPosts(mapped);
        setPostsPage(0);
        setHasMorePosts(res.number + 1 < res.totalPages);
      } catch (error) {
        console.error('Error fetching profile posts:', error);
        setPosts([]);
        setHasMorePosts(false);
      }
    },
    [userId, currentUser?.id],
  );

  const handleLoadMorePosts = React.useCallback(async () => {
    const targetAuthorId = profile?.id || userId;
    if (!targetAuthorId || loadingMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const nextPage = postsPage + 1;
      const res = await postService.getAllPosts(currentUser?.id, targetAuthorId, nextPage, PAGE_SIZE);
      const mapped = res.content
        .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
        .map(mapApiPost);
      setPosts(prev => [...prev, ...mapped]);
      setPostsPage(nextPage);
      setHasMorePosts(res.number + 1 < res.totalPages);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [profile?.id, userId, postsPage, loadingMorePosts, currentUser?.id]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!userId || userId === 'undefined' || userId === '') {
        setLoading(false);
        return;
      }
      try {
        let userResponse: AuthUser;
        try {
          userResponse = await authService.getUserById(userId);
        } catch {
          userResponse = await authService.getUserByUsername(userId);
        }

        const targetProfileId = userResponse.id;
        const fetchStatusPromise = (!currentUser || currentUser.id === targetProfileId)
          ? Promise.resolve(null)
          : friendService.getStatus(currentUser.id, targetProfileId);

        const [friendsResponse, statusResponse] = await Promise.all([
          friendService.getFriends(targetProfileId),
          fetchStatusPromise,
        ]);

        if (!isMounted) return;
        
        setResolvedProfileId(targetProfileId);
        setProfile(userResponse);
        if (userResponse.username && userId !== userResponse.username) {
          navigate(
            {
              pathname: `/profile/${userResponse.username}`,
              search: location.search,
            },
            { replace: true },
          );
        }
        
        const mappedFriends = friendsResponse.map(f => ({
          id: f.userId,
          name: f.fullName,
          avatar: f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName)}&background=random`
        }));
        setFriends(mappedFriends);
        setFriendshipStatus(statusResponse);

        await fetchProfilePosts(userResponse);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        if (!isMounted) return;

        if (currentUser && (userId === currentUser.id || userId === currentUser.username)) {
          setResolvedProfileId(currentUser.id);
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
  }, [fetchProfilePosts, userId, currentUser?.id, navigate, location.search]);

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

  const profilePathKey = profile?.username || resolvedProfileId || userId;

  const userProfile = {
    id: profile?.id || resolvedProfileId || userId,
    fullName: profile?.fullName || 'Quốc Kiệt',
    username: profile?.username || currentUser?.username || '',
    avatar: profile?.avatarUrl || (isRouteCurrentUser ? currentUser?.avatarUrl : undefined) || DEFAULT_AVATAR,
    coverPhoto: profile?.coverPhotoUrl || (isRouteCurrentUser ? currentUser?.coverPhotoUrl : undefined) || DEFAULT_COVER,
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
          profileUserId={userProfile.id}
          friendshipStatus={friendshipStatus}
          onFriendshipStatusChange={setFriendshipStatus}
          onEditClick={() => setIsEditDialogOpen(true)}
          onAvatarUpload={isOwnProfile ? handleAvatarUpload : undefined}
          onCoverUpload={isOwnProfile ? handleCoverUpload : undefined}
        />

        <ProfileTabs profileKey={profilePathKey} isOwnProfile={isOwnProfile} />

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

              <FriendsPreview userId={profilePathKey}
                friendsCount={userProfile.friendsCount}
                friends={friends}
              />

              <PhotosPreview userId={profilePathKey} photos={photos} />
            </div>

            <div className="space-y-4 order-1 lg:order-2">
              {isOwnProfile && (
                <ProfileCreatePost
                  username={userProfile.fullName}
                  onPostCreated={() => fetchProfilePosts(profile || currentUser)}
                />
              )}
              <ProfilePosts
                posts={posts}
                loading={loading}
                hasMore={hasMorePosts}
                loadingMore={loadingMorePosts}
                onLoadMore={handleLoadMorePosts}
              />
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

