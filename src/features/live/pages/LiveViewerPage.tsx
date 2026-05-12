import { MessageCircle, MoreHorizontal, Volume2, X } from 'lucide-react';
import { useState } from 'react';
import { Header } from '../../home/components';

export default function LiveViewerPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="pt-14 grid grid-cols-1 xl:grid-cols-[1.35fr_380px] gap-0">
        <section className="bg-black min-h-[calc(100vh-56px)] relative">
          <button className="absolute left-4 top-4 text-white/90 hover:text-white" aria-label="Đóng">
            <X className="w-8 h-8" />
          </button>

          <div className="absolute top-4 right-4 rounded-md bg-red-600 text-white text-sm font-semibold px-2 py-1">TRỰC TIẾP</div>

          <div className="h-[calc(100vh-160px)] flex items-center justify-center">
            <div className="text-white/70 text-lg">Nội dung video trực tiếp</div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            <div className="flex items-center gap-3 text-white text-sm mb-2">
              <span>0:22 / 0:35</span>
              <div className="flex-1 h-1 rounded bg-white/30 overflow-hidden">
                <div className="h-full w-2/3 bg-blue-500" />
              </div>
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 text-3xl">
              <span>👍</span><span>❤️</span><span>🥰</span><span>😆</span><span>😮</span><span>😢</span><span>😡</span>
            </div>
          </div>
        </section>

        <aside className="relative border-l border-gray-200 bg-white min-h-[calc(100vh-56px)] p-4 flex flex-col">
          <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
            <div className="h-12 w-12 rounded-full bg-gray-200" />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-semibold text-gray-900">Quốc Kiệt <span className="font-normal text-gray-600">đang phát trực tiếp.</span></p>
              <p className="text-sm text-gray-500">Vừa xong</p>
            </div>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Tùy chọn"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>

          {isMenuOpen && (
            <div className="absolute right-4 top-20 z-20 w-[360px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100">
                <p className="font-semibold text-gray-900">Lưu video</p>
                <p className="text-sm text-gray-500">Thêm vào phần Video đã lưu.</p>
              </button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100">
                <p className="font-semibold text-gray-900">Chỉnh sửa bài viết</p>
                <p className="text-sm text-gray-500">Chỉnh sửa chi tiết, gắn thẻ người khác.</p>
              </button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"><p className="font-semibold text-gray-900">Tắt thông báo về bài viết này</p></button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"><p className="font-semibold text-gray-900">Sao chép liên kết</p></button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"><p className="font-semibold text-gray-900">Chuyển video</p></button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"><p className="font-semibold text-gray-900">Xóa video</p></button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"><p className="font-semibold text-gray-900">Quản lý huy hiệu của bạn</p></button>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-gray-100 p-5 text-center text-gray-500">
            <MessageCircle className="w-7 h-7 mx-auto mb-2" />
            <p className="font-semibold">Chưa có bình luận</p>
            <p className="text-sm">Bình luận của đối tượng sẽ hiển thị ở đây.</p>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-200 flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <input className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 outline-none" placeholder="Viết bình luận..." />
          </div>
        </aside>
      </div>
    </div>
  );
}
