import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../features/home/components/Header';
import { LeftSidebar } from '../features/home/components/LeftSidebar';
import { useSidebar } from '../contexts/SidebarContext';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/home' || location.pathname === '/home/';
  const { setLeftSidebarOpen } = useSidebar();

  useEffect(() => {
    if (!isHomePage) {
      setLeftSidebarOpen(false);
    }
  }, [isHomePage, setLeftSidebarOpen]);

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