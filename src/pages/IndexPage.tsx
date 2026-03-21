import { Link } from 'react-router-dom';
import { Users, Shield, Zap, Heart, ArrowRight, Sparkles } from 'lucide-react';

export function IndexPage() {
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Kết nối bạn bè",
      description: "Tìm kiếm và kết nối với bạn bè, người thân trên khắp mọi nơi"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "An toàn & Bảo mật",
      description: "Thông tin của bạn được bảo vệ tuyệt đối với công nghệ mã hóa hiện đại"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Trải nghiệm nhanh",
      description: "Giao diện mượt mà, tốc độ tải trang nhanh chóng"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Cộng đồng thân thiện",
      description: "Tham gia cộng đồng văn minh, tích cực và đầy năng lượng"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          {/* Logo & Brand */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center mb-6 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-3xl flex items-center justify-center shadow-xl transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                <span className="text-4xl sm:text-5xl font-bold text-white">K</span>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 sm:mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600">
                KConnecta
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto">
              Mạng xã hội kết nối mọi người
              <br />
              <span className="text-lg text-gray-500">Chia sẻ khoảnh khắc, kết nối yêu thương</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <Link
                to="/auth/register"
                className="w-full sm:w-auto group relative px-8 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center justify-center gap-2">
                  Bắt đầu ngay
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              
              <Link
                to="/auth/login"
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tại sao chọn KConnecta?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Trải nghiệm mạng xã hội thế hệ mới với những tính năng tuyệt vời
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-white">
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-bold">10K+</div>
              <div className="text-emerald-100 text-lg">Người dùng</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-bold">50K+</div>
              <div className="text-emerald-100 text-lg">Kết nối</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl sm:text-5xl font-bold">100K+</div>
              <div className="text-emerald-100 text-lg">Bài viết</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Sẵn sàng tham gia cộng đồng?
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Đăng ký ngay hôm nay để khám phá thế giới kết nối mới
        </p>
        <Link
          to="/auth/register"
          className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          Tạo tài khoản miễn phí
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}