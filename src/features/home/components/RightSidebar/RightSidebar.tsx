import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { friendService } from '@/services/friendService';
import { authService } from '@/services/authService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import { AlbumSidebarCard } from '@/features/albums/components/AlbumSidebarCard/AlbumSidebarCard';

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function RightSidebar() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { subscribePresenceStatuses } = useRealtimeCall();
  const currentUser = authService.getCurrentUser();

  const filteredContacts = query.trim()
    ? contacts.filter((c) => normalizeSearchText(c.name).includes(normalizeSearchText(query)))
    : contacts;

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);
    friendService.getFriends(currentUser.id)
      .then((friends) => {
        setContacts(friends.map(f => ({
          id: f.userId,
          name: f.fullName,
          avatar: f.avatarUrl?.trim() || '',
        })));
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  useEffect(() => {
    return subscribePresenceStatuses((status) => {
      setPresence((prev) => ({
        ...prev,
        [status.userId]: status.online,
      }));
    });
  }, [subscribePresenceStatuses]);

  return (
    <aside className="hidden lg:flex lg:flex-col w-[280px] xl:w-[360px] h-[calc(100vh-56px)] sticky top-14 overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <AlbumSidebarCard />
      </div>

      {/* Chỉ scroll danh sách người liên hệ */}
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
        <div className="shrink-0 pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-muted-foreground font-semibold">Người liên hệ</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(v => {
                    if (v) setQuery('');
                    return !v;
                  });
                }}
                aria-label={searchOpen ? 'Đóng tìm kiếm người liên hệ' : 'Tìm kiếm người liên hệ'}
                aria-expanded={searchOpen}
                className={`p-2 rounded-full transition-colors ${ searchOpen ? 'bg-muted' : 'hover:bg-muted' }`}
              >
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="relative mb-2">
              <label htmlFor="contact-search" className="sr-only">
                Tìm người liên hệ
              </label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <input
                id="contact-search"
                ref={searchInputRef}
                type="search"
                name="contact"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm người liên hệ"
                className="w-full bg-muted rounded-full py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar space-y-1 pr-0.5">
          {loading && contacts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                type="button"
                key={contact.id}
                onClick={() => navigate(`/messages?with=${contact.id}`)}
                className="flex w-full items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors cursor-pointer group text-left"
              >
                <div className="relative">
                  <UserAvatar
                    name={contact.name}
                    avatarUrl={contact.avatar}
                    userId={contact.id}
                    rounded="full"
                    className="w-9 h-9"
                  />
                  {presence[contact.id] && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground group-hover:underline">
                  {contact.name}
                </span>
              </button>
            ))
          ) : query.trim() ? (
            <div className="p-2 text-sm text-muted-foreground">Không tìm thấy người liên hệ</div>
          ) : (
            <div className="p-2 text-sm text-muted-foreground">Không có người liên hệ</div>
          )}
        </div>
      </div>
    </aside>
  );
}
