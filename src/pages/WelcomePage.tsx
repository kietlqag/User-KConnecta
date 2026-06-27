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
    <div className="relative mx-auto w-full max-w-sm md:max-w-none">
      <div
        aria-hidden="true"
        className="animate-welcome-pulse-glow pointer-events-none absolute right-0 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full opacity-40 lg:h-48 lg:w-48"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
      />

      <div className="relative space-y-2 lg:space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="animate-welcome-float-delayed rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1.5 shadow-lg backdrop-blur-sm lg:px-3 lg:py-2">
            <p className="text-[11px] font-medium text-emerald-200 lg:text-xs">+3 bạn vừa online</p>
          </div>
          <div className="animate-welcome-float-delayed flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-card/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm lg:px-3 lg:py-1.5 lg:text-xs">
            <Video className="h-3 w-3 text-emerald-400 lg:h-3.5 lg:w-3.5" />
            Live đang diễn ra
          </div>
        </div>

        <div className="animate-welcome-float rounded-2xl border border-white/10 bg-card/[0.07] p-3 shadow-2xl shadow-emerald-950/40 backdrop-blur-sm lg:p-4">
          <div className="mb-2 flex items-center gap-2.5 lg:mb-3 lg:gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white lg:h-10 lg:w-10">
              M
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Minh Anh</p>
              <p className="text-[11px] text-white/45 lg:text-xs">vừa chia sẻ · 2 phút trước</p>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-white/80 lg:text-sm">
            Cuối tuần đi cafe với nhóm không? ☕ Mình book chỗ rồi, ai rảnh nhắn nhé!
          </p>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-white/50 lg:mt-3 lg:text-xs">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-400 lg:h-3.5 lg:w-3.5" />
              24
            </span>
            <span>8 bình luận</span>
          </div>
        </div>

        <div className="animate-welcome-float flex justify-end">
          <div className="flex max-w-[85%] items-center gap-2 rounded-xl border border-white/10 bg-[#1a1a35]/90 px-3 py-2 shadow-xl backdrop-blur-sm lg:py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 lg:h-8 lg:w-8">
              <MessageCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white lg:text-xs">Lan: Gọi video nhé?</p>
              <p className="text-[10px] text-white/40 lg:text-[11px]">Đang nhập...</p>
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

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col items-center justify-center px-6 py-10 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(520px,70vh)] w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.16) 0%, transparent 68%)' }}
        />

        <header className="relative mb-8 text-center sm:mb-10">
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-3">
              <img src={logoV2} alt="KConnecta" className="h-12 w-auto sm:h-14" />
              <p className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">KConnecta</p>
            </div>
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              Mạng xã hội mới
            </span>
          </div>
        </header>

        <div className="relative grid w-full items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
          <div className="text-center md:text-left">
            <h1 className="text-[1.7rem] font-bold leading-[1.18] tracking-tight text-white sm:text-[2rem] lg:text-[2.25rem]">
              Kết nối thật sự.
              <br />
              <span className="text-emerald-400">Chia sẻ thật lòng.</span>
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-7 text-white/60 md:mx-0">
              Giữ liên lạc với người quan trọng.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/5 px-3 py-1.5 text-xs font-medium text-white/70"
                  >
                    <Icon className="h-3.5 w-3.5 text-emerald-400" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>

          <WelcomePreview />
        </div>

        <div className="relative mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:justify-center">
          <Link
            to="/auth/register"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 sm:min-w-[220px]"
          >
            Tạo tài khoản miễn phí
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/auth/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-7 text-sm font-semibold text-white/85 transition-colors hover:border-white/35 hover:bg-card/5 sm:min-w-[140px]"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
