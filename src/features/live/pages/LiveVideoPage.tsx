import { Video, Calendar } from 'lucide-react';
import { Header } from '../../home/components';
import { LiveSidebar, LiveOptionCard } from '../components';

export default function LiveVideoPage() {
  const handleGoLive = () => {
    console.log('Starting live video...');
    // Navigation logic to actual live stream interface
  };

  const handleCreateEvent = () => {
    console.log('Creating live event...');
    // Navigation logic to event creation form
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="pt-14 flex">
        {/* Left Sidebar */}
        <LiveSidebar />

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Khang ơi, chào mừng bạn quay lại!</h1>
              <p className="text-gray-600">Chọn cách bạn muốn phát trực tiếp</p>
            </div>

            {/* Option Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Go Live Card */}
              <LiveOptionCard
                icon={<Video className="w-10 h-10 text-blue-600" />}
                title="Phát trực tiếp"
                description="Phát trực tiếp một mình hoặc cùng với người khác"
                features={[
                  'Phát trực tiếp một mình hoặc cùng với người khác',
                  'Chọn nơi đăng video trực tiếp',
                  'Khám phá thêm công cụ để thu hút người xem',
                ]}
                buttonText="Phát trực tiếp"
                buttonVariant="primary"
                onClick={handleGoLive}
              />

              {/* Create Event Card */}
              <LiveOptionCard
                icon={<Calendar className="w-10 h-10 text-gray-600" />}
                title="Tạo sự kiện phát trực tiếp"
                description="Tạo trước một sự kiện để chia sẻ với đối tượng"
                features={[
                  'Tạo trước một sự kiện để chia sẻ với đối tượng',
                  'Người xem có thể hồi vụ sự kiện của bạn',
                  'Bạn và người xem sẽ nhận được lời nhắc trước khi bạn phát trực tiếp',
                ]}
                buttonText="Tạo sự kiện"
                buttonVariant="secondary"
                onClick={handleCreateEvent}
              />
            </div>

            {/* Additional Options */}
            <div className="mt-8 flex items-center justify-center gap-6 text-sm">
              <button className="text-blue-600 hover:underline font-medium">
                Đang phát trực tiếp
              </button>
              <span className="text-gray-300">•</span>
              <button className="text-blue-600 hover:underline font-medium">
                Buổi phát trực tiếp theo lịch
              </button>
            </div>

            {/* Help Section */}
            <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-4">Đóng góp ý kiến</h3>
              <p className="text-sm text-gray-600 mb-4">
                Chúng tôi luôn cải thiện trải nghiệm phát trực tiếp. Hãy cho chúng tôi biết suy nghĩ của bạn!
              </p>
              <button className="text-blue-600 hover:underline text-sm font-medium">
                Gửi phản hồi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
