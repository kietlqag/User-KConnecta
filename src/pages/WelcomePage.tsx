import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MessageCircle,
  Heart,
  Video,
  Shield,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import logoV2 from '@/assets/LogoKConnecta_V2.png';

const highlights: { icon: LucideIcon; label: string }[] = [
  { icon: Zap, label: 'Miễn phí' },
  { icon: Shield, label: 'Không quảng cáo' },
  { icon: Heart, label: 'Dành cho người Việt' },
];

function WelcomePreview() {
  return (
    <div className="relative mx-auto w-full max-w-md md:max-w-none">
      <div
        aria-hidden="true"
        className="animate-welcome-pulse-glow pointer-events-none absolute right-0 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full opacity-40 lg:h-56 lg:w-56"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
      />

      <div className="relative space-y-3 lg:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="animate-welcome-float-delayed rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-3 py-2 shadow-lg backdrop-blur-sm lg:px-4 lg:py-2.5">
            <p className="text-xs font-medium text-emerald-200 lg:text-sm">+3 bạn vừa online</p>
          </div>
          <div className="animate-welcome-float-delayed flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-card/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm lg:px-4 lg:py-2 lg:text-sm">
            <Video className="h-3.5 w-3.5 text-emerald-400 lg:h-4 lg:w-4" />
            Live đang diễn ra
          </div>
        </div>

        <div className="animate-welcome-float rounded-2xl border border-white/10 bg-card/[0.07] p-4 shadow-2xl shadow-emerald-950/40 backdrop-blur-sm lg:p-5">
          <div className="mb-3 flex items-center gap-3 lg:mb-4 lg:gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-base font-bold text-white lg:h-12 lg:w-12">
              M
            </span>
            <div>
              <p className="text-base font-semibold text-white">Minh Anh</p>
              <p className="text-xs text-white/45 lg:text-sm">vừa chia sẻ · 2 phút trước</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/80 lg:text-base">
            Cuối tuần đi cafe với nhóm không? ☕ Mình book chỗ rồi, ai rảnh nhắn nhé!
          </p>
          <div className="mt-3 flex items-center gap-5 text-xs text-white/50 lg:mt-4 lg:text-sm">
            <span className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-400 lg:h-4 lg:w-4" />
              24
            </span>
            <span>8 bình luận</span>
          </div>
        </div>

        <div className="animate-welcome-float flex justify-end">
          <div className="flex max-w-[85%] items-center gap-2.5 rounded-xl border border-white/10 bg-[#1a1a35]/90 px-4 py-2.5 shadow-xl backdrop-blur-sm lg:py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 lg:h-10 lg:w-10">
              <MessageCircle className="h-4 w-4 lg:h-5 lg:w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white lg:text-sm">Lan: Gọi video nhé?</p>
              <p className="text-[11px] text-white/40 lg:text-xs">Đang nhập...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WelcomePage() {
  return (
    <div
      className="welcome-page relative h-[100dvh] overflow-hidden"
      style={{ background: '#111126' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 65%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-0 h-96 w-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 65%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1/4 left-1/3 h-64 w-64 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #059669 0%, transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(640px,75vh)] w-[min(900px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.16) 0%, transparent 68%)' }}
        />

        <header className="relative mb-10 text-center sm:mb-12">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3.5">
              <img src={logoV2} alt="KConnecta" className="h-14 w-auto sm:h-16" />
              <p className="text-3xl font-bold tracking-tight text-white sm:text-[2.125rem]">KConnecta</p>
            </div>
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
              Mạng xã hội mới
            </span>
          </div>
        </header>

        <div className="relative grid w-full items-center gap-10 md:grid-cols-2 md:gap-14 lg:gap-20">
          <div className="text-center md:text-left">
            <h1 className="text-[2.25rem] font-bold leading-[1.15] tracking-tight text-white sm:text-[2.75rem] lg:text-[3.25rem]">
              Kết nối thật sự.
              <br />
              <span className="text-emerald-400">Chia sẻ thật lòng.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-white/60 md:mx-0">
              Giữ liên lạc với người quan trọng.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5 md:justify-start">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-card/5 px-4 py-2 text-sm font-medium text-white/70"
                  >
                    <Icon className="h-4 w-4 text-emerald-400" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>

          <WelcomePreview />
        </div>

        <div className="relative mt-12 flex w-full flex-col gap-3.5 sm:mt-14 sm:w-auto sm:flex-row sm:justify-center">
          <Link
            to="/auth/register"
            className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-9 text-base font-semibold text-white transition-colors hover:bg-emerald-500 sm:min-w-[260px]"
          >
            Tạo tài khoản miễn phí
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/auth/login"
            className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl border border-white/20 px-9 text-base font-semibold text-white/85 transition-colors hover:border-white/35 hover:bg-card/5 sm:min-w-[160px]"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
