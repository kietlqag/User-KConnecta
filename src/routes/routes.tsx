import { Outlet, createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../layouts';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../features/auth/pages';
import { WelcomePage } from '../pages';
import { CreateStoryPage, StoryViewerPage } from '../features/stories/pages';
import { HomePage } from '../features/home/pages';
import {
  ProfilePage,
  ProfileFriendsPage,
  ProfilePhotosPage,
  ProfileAboutPage,
  ProfileReelsPage,
  ProfileAlbumsPage,
  ProfileLikesPage,
  ProfileScheduledPage,
  ProfileLayout,
} from '../features/profile/pages';
import { FriendsPage } from '../features/friends/pages';
import {
  GroupsPage,
  CreateGroupPage,
  GroupDetailPage,
  JoinedGroupsPage,
  DiscoverGroupsPage,
  GroupSearchPage,
} from '../features/groups/pages';
import { WatchPage } from '../features/watch/pages';
import { MarketplacePage } from '../features/marketplace/pages';
import LiveVideoPage from '../features/live/pages/LiveVideoPage';
import LiveSetupPage from '../features/live/pages/LiveSetupPage';
import LiveEventPage from '../features/live/pages/LiveEventPage';
import LiveProducerPage from '../features/live/pages/LiveProducerPage';
import LiveViewerPage from '../features/live/pages/LiveViewerPage';
import SearchResultsPage from '../features/search/pages/SearchResultsPage';
import MessengerPage from '../features/messenger/pages/MessengerPage';
import { SavedPage } from '../features/saved/pages/SavedPage';
import { AlbumListPage, AlbumDetailPage, CreateAlbumPage } from '../features/albums/pages';
import SettingsPage from '../features/settings/pages/SettingsPage';
import MyReportsPage from '../features/reports/pages/MyReportsPage';
import PrivacyPolicyPage from '../features/policies/pages/PrivacyPolicyPage';
import TermsOfServicePage from '../features/policies/pages/TermsOfServicePage';
import ContactPage from '../features/policies/pages/ContactPage';
import { GuestRoute, ProtectedRoute } from './RouteGuards';
import { RealtimeCallProvider } from '../contexts/RealtimeCallContext';
import { MessageNotificationsListener } from '../features/messenger/components/MessageNotificationsListener';

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
        Component: PrivacyPolicyPage,
      },
      {
        path: '/terms',
        Component: TermsOfServicePage,
      },
      {
        path: '/contact',
        Component: ContactPage,
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
            path: '/groups/search',
            Component: GroupSearchPage,
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
            path: '/live/event',
            Component: LiveEventPage,
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
            path: '/albums/create',
            Component: CreateAlbumPage,
          },
          {
            path: '/albums',
            Component: AlbumListPage,
          },
          {
            path: '/albums/:albumId',
            Component: AlbumDetailPage,
          },
          {
            path: '/settings',
            Component: SettingsPage,
          },
          {
            path: '/my-reports',
            Component: MyReportsPage,
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