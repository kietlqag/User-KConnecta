import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isLeftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
  // Initialize from localStorage or default to true on desktop
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('leftSidebarOpen');
    if (stored !== null) {
      return stored === 'true';
    }
    return false;
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('leftSidebarOpen', String(isLeftSidebarOpen));
  }, [isLeftSidebarOpen]);

  const toggleLeftSidebar = () => {
    setIsLeftSidebarOpen((prev) => !prev);
  };

  const setLeftSidebarOpen = (open: boolean) => {
    setIsLeftSidebarOpen(open);
  };

  return (
    <SidebarContext.Provider
      value={{
        isLeftSidebarOpen,
        toggleLeftSidebar,
        setLeftSidebarOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
