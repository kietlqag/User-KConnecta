import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import logoV1 from '@/assets/LogoKConnecta_V1.png';

export function WelcomePage() {
  const [isContentVisible, setIsContentVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsContentVisible(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 h-72 w-72 animate-blob rounded-full bg-emerald-300 opacity-20 mix-blend-multiply blur-xl"></div>
        <div className="animation-delay-2000 absolute top-40 right-10 h-72 w-72 animate-blob rounded-full bg-teal-300 opacity-20 mix-blend-multiply blur-xl"></div>
        <div className="animation-delay-4000 absolute -bottom-8 left-1/2 h-72 w-72 animate-blob rounded-full bg-green-300 opacity-20 mix-blend-multiply blur-xl"></div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="group relative mb-6 inline-flex items-center justify-center animate-logo-intro">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 opacity-25 blur-3xl transition-opacity group-hover:opacity-40"></div>
            <img
              src={logoV1}
              alt="KConnecta"
              className="relative w-56 transform drop-shadow-2xl transition-transform group-hover:scale-105 sm:w-64 lg:w-72"
            />
          </div>

          <p
            className={`mx-auto mb-8 max-w-2xl text-xl text-gray-600 transition-all duration-1000 ease-out sm:mb-12 sm:text-2xl ${
              isContentVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            Mạng xã hội kết nối mọi người
            <br />
            <span className="text-lg text-gray-500">Chia sẻ khoảnh khắc, kết nối yêu thương</span>
          </p>

          <div
            className={`mx-auto flex max-w-md flex-col items-center justify-center gap-4 transition-all duration-1000 ease-out sm:flex-row ${
              isContentVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <Link
              to="/auth/register"
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-8 py-4 font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 opacity-0 transition-opacity group-hover:opacity-100"></div>
              <span className="relative flex items-center justify-center gap-2">
                Bắt đầu ngay
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>

            <Link
              to="/auth/login"
              className="w-full rounded-2xl border-2 border-gray-200 bg-white px-8 py-4 font-semibold text-gray-700 transition-all duration-300 hover:scale-105 hover:border-emerald-300 hover:bg-gray-50 hover:shadow-lg active:scale-95 sm:w-auto"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logoIntro {
          0% {
            opacity: 0;
            transform: translateY(110px) scale(2);
          }
          35% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-logo-intro {
          animation: logoIntro 1500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
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

