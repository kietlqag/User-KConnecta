import { ReactNode } from 'react';
import { useLocation } from 'react-router@7.1.3';
import { Header } from '../features/home/components/Header';
import { LeftSidebar } from '../features/home/components/LeftSidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/home' || location.pathname === '/home/';

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      {/* Left Sidebar - Only on /home */}
      {isHomePage && <LeftSidebar />}
      
      {/* Main Content Area */}
      <div className={`pt-14 ${isHomePage ? 'lg:pl-72' : ''}`}>
        {children}
      </div>
    </div>
  );
};