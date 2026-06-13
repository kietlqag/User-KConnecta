import { Link } from 'react-router-dom';
import { ArrowRight, Users, MessageCircle, Star, type LucideIcon } from 'lucide-react';
import logoV2 from '@/assets/LogoKConnecta_V2.png';

const gridBg = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
} as const;

const stats: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Users,         value: '10,000+', label: 'Người dùng đang hoạt động' },
  { icon: MessageCircle, value: '500+',    label: 'Nhóm cộng đồng' },
  { icon: Star,          value: '4.8 / 5', label: 'Đánh giá từ người dùng' },
];

export function WelcomePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Left panel — dark navy */}
      <div
        className="relative flex flex-1 flex-col justify-between overflow-hidden p-10 lg:p-14"
        style={{ background: '#111126', ...gridBg }}
      >
        {/* Emerald radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img src={logoV2} alt="KConnecta" className="h-10 w-auto" />
        </div>

        {/* Heading + CTAs */}
        <div className="relative z-10 max-w-md">
          <span className="mb-4 inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Mạng xã hội mới
          </span>
          <h1
            className="mb-4 text-4xl font-extrabold leading-tight text-white lg:text-5xl"
            style={{ letterSpacing: '-0.03em' }}
          >
            Kết nối thật sự.{' '}
            <span className="text-emerald-400">Chia sẻ thật lòng.</span>
          </h1>
          <p className="mb-8 text-base leading-relaxed text-white/60">
            KConnecta là nơi bạn kết nối với những người quan trọng — không thuật toán, không rác, không phô trương.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-400 hover:shadow-[0_6px_20px_rgba(16,185,129,0.5)] active:scale-95"
            >
              Tạo tài khoản miễn phí
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition-all hover:border-white/40 hover:text-white active:scale-95"
            >
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>
        </div>
      </div>

      {/* Right panel — light */}
      <div className="flex w-full flex-col items-center justify-center gap-6 bg-[#f5f5fa] p-10 lg:w-[420px] lg:p-14">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">
          Tại sao chọn KConnecta?
        </p>
        <div className="flex w-full flex-col gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#e4e4f0] bg-white p-5 shadow-[0_1px_3px_rgba(17,17,38,0.06)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <s.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-[#111126]">{s.value}</p>
              <p className="text-sm text-[#6b6b8a]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
