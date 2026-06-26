import { Outlet, createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../layouts';
import { WelcomePage } from '../pages';
import { HomePage } from '../features/home/pages';
import { GuestRoute, ProtectedRoute } from './RouteGuards';
import { RealtimeCallProvider } from '../contexts/RealtimeCallContext';
import { MessageNotificationsListener } from '../features/messenger/components/MessageNotificationsListener';
import { lazyDefault, lazyNamed } from './lazyRoutes';

function RealtimeLayout() {
  return (
    <RealtimeCallProvider>
      <MessageNotificationsListener />
      <Outlet />
    </RealtimeCallProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: WelcomePage,
  },
  {
    Component: RealtimeLayout,
    children: [
      {
        path: '/privacy',
        lazy: () => lazyDefault(() => import('../features/policies/pages/PrivacyPolicyPage')),
      },
      {
        path: '/terms',
        lazy: () => lazyDefault(() => import('../features/policies/pages/TermsOfServicePage')),
      },
      {
        path: '/contact',
        lazy: () => lazyDefault(() => import('../features/policies/pages/ContactPage')),
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: '/home',
            Component: HomePage,
          },
          {
            path: '/profile/:userId?',
            lazy: async () => {
              const { ProfileLayout, ProfilePage, ProfileFriendsPage, ProfilePhotosPage, ProfileAboutPage, ProfileReelsPage, ProfileAlbumsPage, ProfileLikesPage, ProfileScheduledPage } =
                await import('../features/profile/pages');
              return {
                Component: ProfileLayout,
                children: [
                  { index: true, Component: ProfilePage },
                  { path: 'friends', Component: ProfileFriendsPage },
                  { path: 'photos', Component: ProfilePhotosPage },
                  { path: 'albums', Component: ProfileAlbumsPage },
                  { path: 'about', Component: ProfileAboutPage },
                  { path: 'reels', Component: ProfileReelsPage },
                  { path: 'likes', Component: ProfileLikesPage },
                  { path: 'scheduled', Component: ProfileScheduledPage },
                ],
              };
            },
          },
          {
            path: '/friends',
            lazy: () => lazyNamed(() => import('../features/friends/pages'), 'FriendsPage'),
          },
          {
            path: '/groups',
            lazy: () => lazyNamed(() => import('../features/groups/pages'), 'GroupsPage'),
          },
          {
            path: '/groups/create',
            lazy: () => lazyNamed(() => import('../features/groups/pages'), 'CreateGroupPage'),
          },
          {
            path: '/groups/joined',
            lazy: () => lazyNamed(() => import('../features/groups/pages'), 'JoinedGroupsPage'),
          },
          {
            path: '/groups/discover',
            lazy: () => lazyNamed(() => import('../features/groups/pages'), 'DiscoverGroupsPage'),
          },
          {
            path: '/groups/search',
            lazy: () => lazyNamed(() => import('../features/groups/pages'), 'GroupSearchPage'),
          },
          {
            path: '/groups/:groupId',
            lazy: () => lazyNamed(() => import('../features/groups/pages'), 'GroupDetailPage'),
          },
          {
            path: '/watch',
            lazy: () => lazyNamed(() => import('../features/watch/pages'), 'WatchPage'),
          },
          {
            path: '/marketplace',
            lazy: () => lazyNamed(() => import('../features/marketplace/pages'), 'MarketplacePage'),
          },
          {
            path: '/live',
            lazy: () => lazyDefault(() => import('../features/live/pages/LiveVideoPage')),
          },
          {
            path: '/live/setup',
            lazy: () => lazyDefault(() => import('../features/live/pages/LiveSetupPage')),
          },
          {
            path: '/live/event',
            lazy: () => lazyDefault(() => import('../features/live/pages/LiveEventPage')),
          },
          {
            path: '/live/producer',
            lazy: () => lazyDefault(() => import('../features/live/pages/LiveProducerPage')),
          },
          {
            path: '/live/viewer',
            lazy: () => lazyDefault(() => import('../features/live/pages/LiveViewerPage')),
          },
          {
            path: '/search',
            lazy: () => lazyDefault(() => import('../features/search/pages/SearchResultsPage')),
          },
          {
            path: '/messages',
            lazy: () => lazyNamed(() => import('../features/messenger/pages'), 'MessengerPage'),
          },
          {
            path: '/saved',
            lazy: () => lazyNamed(() => import('../features/saved/pages/SavedPage'), 'SavedPage'),
          },
          {
            path: '/albums/create',
            lazy: () => lazyNamed(() => import('../features/albums/pages'), 'CreateAlbumPage'),
          },
          {
            path: '/albums',
            lazy: () => lazyNamed(() => import('../features/albums/pages'), 'AlbumListPage'),
          },
          {
            path: '/albums/:albumId',
            lazy: () => lazyNamed(() => import('../features/albums/pages'), 'AlbumDetailPage'),
          },
          {
            path: '/settings',
            lazy: () => lazyDefault(() => import('../features/settings/pages/SettingsPage')),
          },
          {
            path: '/my-reports',
            lazy: () => lazyDefault(() => import('../features/reports/pages/MyReportsPage')),
          },
          {
            path: '/stories/create',
            lazy: () => lazyNamed(() => import('../features/stories/pages'), 'CreateStoryPage'),
          },
          {
            path: '/stories/:authorId?',
            lazy: () => lazyNamed(() => import('../features/stories/pages'), 'StoryViewerPage'),
          },
        ],
      },
    ],
  },
  {
    path: '/auth',
    Component: GuestRoute,
    children: [
      {
        Component: AuthLayout,
        children: [
          {
            path: 'login',
            lazy: () => lazyNamed(() => import('../features/auth/pages'), 'LoginPage'),
          },
          {
            path: 'register',
            lazy: () => lazyNamed(() => import('../features/auth/pages'), 'RegisterPage'),
          },
          {
            path: 'forgot-password',
            lazy: () => lazyNamed(() => import('../features/auth/pages'), 'ForgotPasswordPage'),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    async lazy() {
      const { NotFoundPage } = await import('@/components/ui/404-page-not-found');
      return { Component: NotFoundPage };
    },
  },
]);
