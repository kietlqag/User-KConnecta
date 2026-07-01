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
  const showSidebar = 
    location.pathname === '/home' || 
    location.pathname === '/home/';
  const { setLeftSidebarOpen } = useSidebar();

  useEffect(() => {
    if (!showSidebar) {
      setLeftSidebarOpen(false);
    }
  }, [showSidebar, setLeftSidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Left Sidebar - Only on /home */}
      {showSidebar && <LeftSidebar />}
      
      {/* Main Content Area */}
      <div className={`pt-14 ${showSidebar ? 'lg:pl-72' : ''}`}>
        {children}
      </div>
    </div>
  );
};