import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreHorizontal, Video, Phone, X } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { friendService } from '@/services/friendService';
import { authService } from '@/services/authService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';

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
    ? contacts.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase()))
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
          avatar: f.avatarUrl || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(f.fullName)}`,
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

  const birthdays: any[] = [];

  return (
    <aside className="hidden lg:block w-[280px] xl:w-[360px] h-[calc(100vh-56px)] sticky top-14 overflow-y-auto pb-4 sidebar-scrollbar">
      <div className="px-4 py-4 space-y-4">
        {/* Birthday Section */}
        {birthdays.length > 0 && (
          <>
            <div>
              <h3 className="text-gray-600 font-semibold mb-3">Sinh nhật</h3>
              {birthdays.map((person) => (
                <div key={person.id} className="flex items-center gap-3 p-2 rounded-lg">
                  <ImageWithFallback
                    src={person.avatar}
                    alt={person.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      Hôm nay là sinh nhật của <span className="font-semibold">{person.name}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-px bg-gray-300" />
          </>
        )}

        {/* Contacts Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-600 font-semibold">Người liên hệ</h3>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Video className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  setSearchOpen(v => {
                    if (v) setQuery('');
                    return !v;
                  });
                }}
                className={`p-2 rounded-full transition-colors ${searchOpen ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              >
                <Search className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreHorizontal className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm người liên hệ"
                className="w-full bg-gray-100 rounded-full py-2 pl-9 pr-9 text-sm text-gray-900 outline-none focus:bg-gray-200 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-1">
            {loading && contacts.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Đang tải...</div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => navigate(`/messages?with=${contact.id}`)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                >
                  <div className="relative">
                    <ImageWithFallback
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    {presence[contact.id] && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:underline">{contact.name}</span>
                </div>
              ))
            ) : (
                <div className="p-2 text-sm text-gray-500">Không có người liên hệ</div>
            )}
          </div>

        </div>
      </div>
    </aside>
  );
}
