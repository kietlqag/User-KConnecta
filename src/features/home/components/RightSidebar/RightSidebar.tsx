import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreHorizontal, Video, Phone } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { friendService } from '@/services/friendService';
import { authService } from '@/services/authService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';

export function RightSidebar() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { subscribePresenceStatuses } = useRealtimeCall();
  const currentUser = authService.getCurrentUser();

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

  const ads = [
    {
      id: '1',
      title: 'Ưu đãi mỗi bạn cực khủng REDMI Note 15 Series',
      sponsor: 'mi.com',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300',
    },
    {
      id: '2',
      title: 'Nhận ngay 0.25 BNB khi cài đặt Binance Desktop!',
      sponsor: 'binance.com',
      image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=300',
    },
  ];

  const birthdays: any[] = [];

  return (
    <aside className="hidden lg:block w-[280px] xl:w-[360px] h-[calc(100vh-56px)] sticky top-14 overflow-y-auto pb-4 sidebar-scrollbar">
      <div className="px-4 py-4 space-y-4">
        {/* Sponsored Section */}
        <div>
          <h3 className="text-gray-600 font-semibold mb-3">Được tài trợ</h3>
          {ads.map((ad) => (
            <a
              key={ad.id}
              href="#"
              className="flex gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors mb-3"
            >
              <ImageWithFallback
                src={ad.image}
                alt={ad.title}
                className="w-[100px] h-[100px] rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                  {ad.title}
                </h4>
                <p className="text-xs text-gray-500">{ad.sponsor}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-300" />

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
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Search className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreHorizontal className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {loading && contacts.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Đang tải...</div>
            ) : contacts.length > 0 ? (
              contacts.map((contact) => (
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