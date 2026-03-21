import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../layouts';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../features/auth/pages';
import { WelcomePage } from '../pages';
import { HomePage } from '../features/home/pages';
import { ProfilePage } from '../features/profile/pages';
import { FriendsPage } from '../features/friends/pages';
import { GroupsPage } from '../features/groups/pages';
import { WatchPage } from '../features/watch/pages';
import { MarketplacePage } from '../features/marketplace/pages';
import LiveVideoPage from '../features/live/pages/LiveVideoPage';
import SearchResultsPage from '../features/search/pages/SearchResultsPage';
import MessengerPage from '../features/messenger/pages/MessengerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: WelcomePage,
  },
  {
    path: '/home',
    Component: HomePage,
  },
  {
    path: '/profile/:username?',
    Component: ProfilePage,
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
    path: '/search',
    Component: SearchResultsPage,
  },
  {
    path: '/messages',
    Component: MessengerPage,
  },
  {
    path: '/auth',
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
]);