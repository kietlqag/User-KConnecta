import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TabItem {
  icon: React.ReactNode;
  href: string;
  label?: string;
}

interface AnimatedTabNavProps {
  items: TabItem[];
  onHomeClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function AnimatedTabNav({ items, onHomeClick }: AnimatedTabNavProps) {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  // Find active tab index based on current route
  const activeIndex = items.findIndex(item => {
    // Exact match for home route
    if (location.pathname === '/home' && item.href === '/home') return true;
    // For other routes, check if pathname starts with href
    if (item.href !== '/home' && location.pathname.startsWith(item.href)) return true;
    return false;
  });

  // Function to update indicator position
  const updateIndicator = () => {
    if (navRef.current && activeIndex !== -1) {
      // Get all tab links (skip the indicator which is the first child)
      const tabLinks = Array.from(navRef.current.children).slice(1) as HTMLElement[];
      const activeTab = tabLinks[activeIndex];
      
      if (activeTab) {
        const navRect = navRef.current.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        
        setIndicatorStyle({
          left: tabRect.left - navRect.left,
          width: tabRect.width,
          opacity: 1,
        });
      }
    } else {
      // Hide indicator if no active tab
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  };

  // Update indicator position when active tab changes
  // Use useLayoutEffect to synchronize before paint
  useLayoutEffect(() => {
    // Execute immediately for synchronous update
    updateIndicator();
    
    // Also run after a frame to handle any layout shifts
    const rafId = requestAnimationFrame(updateIndicator);
    
    return () => cancelAnimationFrame(rafId);
  }, [activeIndex, location.pathname]); // Added location.pathname to ensure updates on route change

  // Handle window resize to recalculate positions
  useLayoutEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeIndex]);

  return (
    <nav 
      ref={navRef}
      className="hidden lg:flex items-center justify-center gap-2 flex-1 max-w-[600px] relative"
    >
      {/* Animated indicator */}
      <div
        className="absolute bottom-0 h-1 bg-primary rounded-t-lg transition-all duration-300 ease-in-out pointer-events-none"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
        }}
      />

      {/* Tab items */}
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        
        return (
          <Link
            key={index}
            to={item.href}
            onClick={item.href === '/home' ? onHomeClick : undefined}
            className={`relative flex items-center justify-center px-10 py-2 rounded-lg transition-colors ${ isActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted' }`}
            aria-label={item.label}
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}
