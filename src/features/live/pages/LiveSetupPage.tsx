import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  FileText,
  Globe,
  MessageSquare,
  Mic,
  MonitorUp,
  Pin,
  Settings,
  Sparkles,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../home/components';

const leftMenuItems = [
  { icon: Camera, label: 'Thiết lập buổi phát trực tiếp', active: true },
  { icon: MonitorUp, label: 'Bảng điều khiển' },
  { icon: Settings, label: 'Cài đặt' },
  { icon: Sparkles, label: 'Tương tác' },
  { icon: Bell, label: 'Báo cáo sự cố' },
];

const destinationOptions = [
  {
    id: 'profile',
    label: 'Đăng lên trang cá nhân',
    description: 'Trang cá nhân của bạn',
    icon: <UserRound className="w-4 h-4 text-violet-600" />,
  },
  {
    id: 'page',
    label: 'Đăng lên trang bạn quản lý',
    description: 'Chia sẻ đến trang của bạn',
    icon: <FileText className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'group',
    label: 'Đăng trong nhóm',
    description: 'Chia sẻ trong các nhóm',
    icon: <UsersRound className="w-4 h-4 text-purple-600" />,
  },
] as const;

export default function LiveSetupPage() {
  const navigate = useNavigate();
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<(typeof destinationOptions)[number]['id']>('profile');
  const selectedDestinationOption = destinationOptions.find((opt) => opt.id === selectedDestination);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="pt-14 flex">
        <aside className="w-[340px] shrink-0 border-r border-gray-200 bg-white p-4 h-[calc(100vh-56px)] sticky top-14 overflow-y-auto">
          <div className="mb-5 border-b border-gray-200 pb-4">
            <h1 className="text-2xl leading-tight font-bold text-gray-900 mb-2">Tạo video trực tiếp</h1>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-1/3 bg-blue-600" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3 text-sm text-gray-900"><CircleCheck className="w-5 h-5 text-green-600" />Kết nối nguồn video</div>
              <div className="flex items-center gap-3 text-sm text-gray-900"><Circle className="w-5 h-5 text-gray-500" />Hoàn tất chi tiết bài viết</div>
              <div className="flex items-center gap-3 text-sm text-gray-900"><Circle className="w-5 h-5 text-gray-500" />Phát trực tiếp</div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
              <UserRound className="w-7 h-7 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">Quốc Kiệt</p>
              <p className="text-sm text-gray-700">Người tổ chức - Trang cá nhân của bạn</p>
            </div>
          </div>

          <div className="space-y-3 border-b border-gray-200 pb-4">
            <div className="relative">
              <button
                onClick={() => setIsDestinationOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-left bg-white hover:bg-gray-50"
              >
                <p className="text-sm text-gray-500">Chọn nơi đăng</p>
                <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                  <span>{selectedDestinationOption?.label}</span>
                  <ChevronDown className={`w-6 h-6 transition-transform ${isDestinationOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDestinationOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {destinationOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedDestination(option.id);
                        setIsDestinationOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">{option.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                      {selectedDestination === option.id && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-left bg-white hover:bg-gray-50">
              <p className="text-sm text-gray-500">Khi nào bạn sẽ phát trực tiếp?</p>
              <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                <span>Bây giờ</span>
                <ChevronDown className="w-6 h-6" />
              </div>
            </button>

            <button className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-base font-medium text-gray-800">
              <Globe className="w-5 h-5" /> Công khai
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {leftMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-semibold ${
                    item.active ? 'bg-blue-50 text-gray-900' : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <span
                    className={`h-11 w-11 rounded-full flex items-center justify-center ${
                      item.active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button className="flex-1 rounded-xl bg-gray-200 py-2.5 text-base font-semibold text-gray-900">Quay lại</button>
            <button onClick={() => navigate('/live/producer')} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-base font-semibold text-white hover:bg-blue-700">Phát trực tiếp</button>
          </div>
        </aside>

        <main className="flex-1 p-6">
          <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">Kiểm soát camera</h2>
                <p className="mb-4 text-base text-gray-700">Trước khi phát trực tiếp, hãy kiểm tra xem đầu vào camera và micrô đã hoạt động đúng cách chưa.</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-2.5">
                    <Camera className="w-6 h-6 text-blue-600" />
                    <span className="flex-1 text-base font-semibold">Redmi Note 11 Pro 5G (Windows Virtual Camera)</span>
                    <ChevronDown className="w-6 h-6" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-2.5">
                      <Mic className="w-6 h-6 text-blue-600" />
                      <span className="flex-1 text-base font-semibold">Default - Microphone A...</span>
                      <ChevronDown className="w-6 h-6" />
                    </div>
                  </div>
                  <button className="w-full rounded-xl bg-gray-200 py-2.5 text-base font-semibold">Chia sẻ màn hình</button>
                  <button className="w-full rounded-xl bg-gray-200 py-2.5 text-base font-semibold">Chia sẻ màn hình</button>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-2xl font-bold">Video</h2>
                <div className="relative h-[300px] rounded-xl bg-black flex items-center justify-center">
                  <div className="absolute left-4 top-4 h-8 w-14 rounded bg-gray-400" />
                  <MonitorUp className="w-20 h-20 text-white/85" />
                </div>
                <button className="mt-4 inline-flex items-center gap-3 text-base font-semibold">
                  <MessageSquare className="w-8 h-8 text-gray-600" /> Nhật ký sự kiện
                </button>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-4 text-2xl font-bold">Thêm chi tiết về bài viết</h2>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserRound className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500">Video trực tiếp của bạn nói về điều gì?</div>
                </div>
                <div className="mb-3 border-t border-gray-200 pt-3 grid grid-cols-2 gap-3 text-sm">
                  <button className="flex items-center gap-2 text-gray-700"><Users className="w-5 h-5 text-blue-600" /> Gắn thẻ người khác</button>
                  <button className="text-left text-gray-700">Check in</button>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>Cài đặt đối tượng</div>
                  <div>Vé và sự kiện</div>
                </div>
                <p className="mt-4 text-sm text-gray-700">Bạn hiện không tổ chức hoặc đồng tổ chức sự kiện nào. <span className="font-semibold text-blue-600">Bắt đầu bằng cách tạo sự kiện mới.</span></p>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-2xl font-bold">Bình luận ghim sẵn</h2>
                <p className="text-sm text-gray-700">Bình luận này sẽ tự động được ghim trong đoạn chat của tất cả video trực tiếp mà bạn đăng.</p>
                <div className="my-4 flex items-center justify-between border-y border-gray-200 py-2.5">
                  <p className="text-sm font-semibold">Bật bình luận ghim sẵn</p>
                  <div className="h-7 w-14 rounded-full bg-gray-400 p-1"><div className="h-5 w-5 rounded-full bg-white" /></div>
                </div>
                <p className="mb-3 text-sm font-semibold">Xem trước</p>
                <div className="mb-3 flex items-center gap-2 text-blue-600 text-sm"><Pin className="w-4 h-4" /> Bình luận ghim</div>
                <div className="rounded-2xl bg-gray-100 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-300" />
                    <div>
                      <p className="text-sm font-semibold">Quốc Kiệt</p>
                      <p className="text-sm text-gray-800">Đây là một bình luận ghim sẵn. Bạn có thể nhấp vào nút Chỉnh sửa bên dưới để thêm bình luận.</p>
                    </div>
                  </div>
                </div>
                <button className="mt-4 w-full rounded-xl bg-gray-200 py-2 text-sm font-semibold text-gray-500">Chỉnh sửa</button>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

