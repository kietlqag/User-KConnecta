import { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Users, Flag, Rss, FileText, Gamepad2, Video, Play, Edit, BookOpen, Image as ImageIcon, Film, PlusCircle, Store, TrendingUp, UserPlus, CalendarPlus, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MenuItemCard } from '../MenuItemCard';
import { CreateItemCard } from '../CreateItemCard';
import { MenuItem, CreateItem } from '../../types/menu.types';

interface MenuPanelProps {
  onClose: () => void;
}

export const MenuPanel = ({ onClose }: MenuPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking the menu toggle button
      if (target.closest('[data-menu-toggle]')) {
        return;
      }
      
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };

    // Add small delay to prevent immediate close when opening
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Social section items
  const socialItems: MenuItem[] = [
    {
      id: 'events',
      icon: <Calendar className="w-5 h-5 text-emerald-600" />,
      title: 'Sự kiện',
      description: 'Tổ chức hoặc tìm sự kiện cùng những hoạt động khác trên mạng xã hội và ở xung quanh đây.',
    },
    {
      id: 'friends',
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      title: 'Bạn bè',
      description: 'Tìm kiếm bạn bè hoặc những người bạn có thể biết.',
      href: '/friends',
    },
    {
      id: 'groups',
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      title: 'Nhóm',
      description: 'Kết nối với những người cùng chung sở thích.',
      href: '/groups',
    },
    {
      id: 'newsfeed',
      icon: <Rss className="w-5 h-5 text-emerald-600" />,
      title: 'Bảng tin',
      description: 'Xem bài viết phù hợp với sở thích của bạn bè, nhóm, trang và những thứ khác.',
    },
    {
      id: 'pages',
      icon: <Flag className="w-5 h-5 text-emerald-600" />,
      title: 'Trang',
      description: 'Khám phá và kết nối với các doanh nghiệp trên Facebook.',
    },
  ];

  // Entertainment section items
  const entertainmentItems: MenuItem[] = [
    {
      id: 'gaming',
      icon: <Gamepad2 className="w-5 h-5 text-purple-600" />,
      title: 'Video chơi game',
      description: 'Xem, kết nối với những game và người phát trực tuyến mà bạn yêu thích.',
    },
    {
      id: 'games',
      icon: <Play className="w-5 h-5 text-purple-600" />,
      title: 'Chơi game',
      description: 'Khám phá các trò chơi trên Facebook.',
    },
    {
      id: 'live',
      icon: <Radio className="w-5 h-5 text-primary" />,
      title: 'Phát trực tuyến',
      description: 'Phát trực tiếp hoặc xem các buổi live đang diễn ra.',
      href: '/live',
    },
    {
      id: 'watch',
      icon: <Video className="w-5 h-5 text-purple-600" />,
      title: 'Video',
      description: 'Xem video phổ biến từ bạn bè và cộng đồng.',
      href: '/watch',
    },
  ];

  // Create items
  const createItems: CreateItem[] = [
    {
      id: 'post',
      icon: <Edit className="w-5 h-5 text-foreground" />,
      title: 'Đăng',
    },
    {
      id: 'story',
      icon: <BookOpen className="w-5 h-5 text-foreground" />,
      title: 'Tin',
    },
    {
      id: 'reel',
      icon: <Film className="w-5 h-5 text-foreground" />,
      title: 'Thước phim',
    },
    {
      id: 'page',
      icon: <Flag className="w-5 h-5 text-foreground" />,
      title: 'Trang',
    },
    {
      id: 'ad',
      icon: <TrendingUp className="w-5 h-5 text-foreground" />,
      title: 'Quảng cáo',
    },
    {
      id: 'group',
      icon: <UserPlus className="w-5 h-5 text-foreground" />,
      title: 'Nhóm',
    },
    {
      id: 'event',
      icon: <CalendarPlus className="w-5 h-5 text-foreground" />,
      title: 'Sự kiện',
    },
    {
      id: 'marketplace',
      icon: <Store className="w-5 h-5 text-foreground" />,
      title: 'Bài niệm yết trên Marketplace',
    },
  ];

  // Filter items based on search query
  const filterItems = (items: MenuItem[]) => {
    if (!searchQuery) return items;
    return items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredSocialItems = filterItems(socialItems);
  const filteredEntertainmentItems = filterItems(entertainmentItems);

  const handleItemClick = (item: MenuItem) => {
    if (item.href) {
      navigate(item.href);
      onClose();
    }
  };

  return (
    <div 
      className="fixed top-14 right-4 w-[680px] bg-popover rounded-xl shadow-2xl border border-border z-50 max-h-[calc(100vh-80px)] flex flex-col animate-in fade-in slide-in-from-right-4 duration-200" 
      ref={panelRef}
      style={{
        boxShadow: '0 12px 28px 0 rgba(0,0,0,0.2), 0 2px 4px 0 rgba(0,0,0,0.1)'
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-2xl font-bold mb-3 text-foreground">Menu</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm trong menu"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background text-foreground placeholder:text-muted-foreground rounded-full text-sm outline-none focus:bg-muted transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-4 p-4">
          {/* Left Column - Main Menu */}
          <div className="flex-1 space-y-4">
            {/* Social Section */}
            {filteredSocialItems.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-2">
                <h3 className="text-sm font-semibold text-muted-foreground px-2 py-1 mb-1">Xã hội</h3>
                <div className="space-y-1">
                  {filteredSocialItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onClick={() => handleItemClick(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Entertainment Section */}
            {filteredEntertainmentItems.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-2">
                <h3 className="text-sm font-semibold text-muted-foreground px-2 py-1 mb-1">Giải trí</h3>
                <div className="space-y-1">
                  {filteredEntertainmentItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onClick={() => handleItemClick(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {searchQuery && filteredSocialItems.length === 0 && filteredEntertainmentItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Không tìm thấy kết quả
              </div>
            )}
          </div>

          {/* Right Column - Create Section */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-card rounded-lg border border-border p-2 sticky top-0">
              <h3 className="text-sm font-semibold text-foreground px-2 py-1 mb-1">Tạo</h3>
              <div className="space-y-1">
                {createItems.map((item) => (
                  <CreateItemCard
                    key={item.id}
                    item={item}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
