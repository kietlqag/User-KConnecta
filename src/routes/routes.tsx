import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../layouts';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../features/auth/pages';
import { WelcomePage } from '../pages';
import { CreateStoryPage, StoryViewerPage } from '../features/stories/pages';
import { HomePage } from '../features/home/pages';
import { ProfilePage, ProfileFriendsPage, ProfilePhotosPage, ProfileAboutPage, ProfileReelsPage, ProfileLikesPage } from '../features/profile/pages';
import { FriendsPage } from '../features/friends/pages';
import { GroupsPage, CreateGroupPage, GroupDetailPage, JoinedGroupsPage, DiscoverGroupsPage } from '../features/groups/pages';
import { WatchPage } from '../features/watch/pages';
import { MarketplacePage } from '../features/marketplace/pages';
import LiveVideoPage from '../features/live/pages/LiveVideoPage';
import LiveSetupPage from '../features/live/pages/LiveSetupPage';
import LiveProducerPage from '../features/live/pages/LiveProducerPage';
import LiveViewerPage from '../features/live/pages/LiveViewerPage';
import SearchResultsPage from '../features/search/pages/SearchResultsPage';
import MessengerPage from '../features/messenger/pages/MessengerPage';
import { SavedPage } from '../features/saved/pages/SavedPage';
import SettingsPage from '../features/settings/pages/SettingsPage';
import { GuestRoute, ProtectedRoute } from './RouteGuards';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: WelcomePage,
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
        Component: ProfilePage,
      },
      {
        path: '/profile/:userId/friends',
        Component: ProfileFriendsPage,
      },
      {
        path: '/profile/:userId/photos',
        Component: ProfilePhotosPage,
      },
      {
        path: '/profile/:userId/about',
        Component: ProfileAboutPage,
      },
      {
        path: '/profile/:userId/reels',
        Component: ProfileReelsPage,
      },
      {
        path: '/profile/:userId/likes',
        Component: ProfileLikesPage,
      },
      {
        path: '/friends',
        Component: FriendsPage,
      },
      {
        path: '/groups',
        Component: GroupsPage,
      },
      {
        path: '/groups/create',
        Component: CreateGroupPage,
      },
      {
        path: '/groups/joined',
        Component: JoinedGroupsPage,
      },
      {
        path: '/groups/discover',
        Component: DiscoverGroupsPage,
      },
      {
        path: '/groups/:groupId',
        Component: GroupDetailPage,
      },
      {
        path: '/watch',
        Component: WatchPage,
      },
      {
        path: '/marketplace',
        Component: MarketplacePage,
      },
      {
        path: '/live',
        Component: LiveVideoPage,
      },
      {
        path: '/live/setup',
        Component: LiveSetupPage,
      },
      {
        path: '/live/producer',
        Component: LiveProducerPage,
      },
      {
        path: '/live/viewer',
        Component: LiveViewerPage,
      },
      {
        path: '/search',
        Component: SearchResultsPage,
      },
      {
        path: '/messages',
        Component: MessengerPage,
      },
      {
        path: '/saved',
        Component: SavedPage,
      },
      {
        path: '/settings',
        Component: SettingsPage,
      },
      {
        path: '/stories/create',
        Component: CreateStoryPage,
      },
      {
        path: '/stories/:authorId?',
        Component: StoryViewerPage,
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
            Component: LoginPage,
          },
          {
            path: 'register',
            Component: RegisterPage,
          },
          {
            path: 'forgot-password',
            Component: ForgotPasswordPage,
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

