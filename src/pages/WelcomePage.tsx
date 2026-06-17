import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Users,
  MessageCircle,
  Sparkles,
  Heart,
  Video,
  Shield,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import logoV2 from '@/assets/LogoKConnecta_V2.png';

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Users, title: 'Kết nối thật', desc: 'Bạn bè, nhóm và cộng đồng quanh bạn.' },
  { icon: MessageCircle, title: 'Nhắn tin tức thời', desc: 'Trò chuyện và gọi video mượt mà.' },
  { icon: Sparkles, title: 'Gọn nhẹ, không rác', desc: 'Dòng thời gian sạch, không thuật toán.' },
];

const highlights: { icon: LucideIcon; label: string }[] = [
  { icon: Zap, label: 'Miễn phí' },
  { icon: Shield, label: 'Không quảng cáo' },
  { icon: Heart, label: 'Dành cho người Việt' },
];

function WelcomePreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
      <div
        aria-hidden="true"
        className="animate-welcome-pulse-glow pointer-events-none absolute right-0 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
      />

      <div className="relative space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="animate-welcome-float-delayed rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-3 py-2 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-medium text-emerald-200">+3 bạn vừa online</p>
          </div>
          <div className="animate-welcome-float-delayed flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <Video className="h-3.5 w-3.5 text-emerald-400" />
            Live đang diễn ra
          </div>
        </div>

        <div className="animate-welcome-float rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-emerald-950/40 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white">
              M
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Minh Anh</p>
              <p className="text-xs text-white/45">vừa chia sẻ · 2 phút trước</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/80">
            Cuối tuần đi cafe với nhóm không? ☕ Mình book chỗ rồi, ai rảnh nhắn nhé!
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              24
            </span>
            <span>8 bình luận</span>
          </div>
        </div>

        <div className="animate-welcome-float flex justify-end">
          <div className="flex max-w-[85%] items-center gap-2 rounded-xl border border-white/10 bg-[#1a1a35]/90 px-3 py-2.5 shadow-xl backdrop-blur-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white">Lan: Gọi video nhé?</p>
              <p className="text-[11px] text-white/40">Đang nhập...</p>
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
      className="welcome-page relative h-[100dvh] max-h-[100dvh] overflow-hidden"
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

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-4 px-6 pb-2 pt-5 sm:pt-6 lg:px-10 lg:pb-3 lg:pt-7">
          <img src={logoV2} alt="KConnecta" className="h-14 w-auto sm:h-16" />
          <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">KConnecta</p>
          <span className="ml-1 hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 sm:inline-flex">
            Mạng xã hội mới
          </span>
        </header>

        <main className="flex min-h-0 flex-1 items-center overflow-hidden px-6 pb-6 lg:px-10 lg:pb-10">
          <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div>
            <span className="mb-5 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 sm:hidden">
              Mạng xã hội mới
            </span>

            <h1 className="text-[2rem] font-bold leading-[1.2] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              Kết nối thật sự.
              <br />
              <span className="text-emerald-400">Chia sẻ thật lòng.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-white/60">
              Giữ liên lạc với người quan trọng.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70"
                  >
                    <Icon className="h-3.5 w-3.5 text-emerald-400" />
                    {item.label}
                  </span>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/register"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 sm:flex-none"
              >
                Tạo tài khoản miễn phí
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-white/20 px-6 text-sm font-semibold text-white/85 transition-colors hover:border-white/35 hover:bg-white/5 sm:flex-none"
              >
                Đăng nhập
              </Link>
            </div>

            <div className="mt-6 sm:mt-8 lg:hidden">
              <WelcomePreview />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="hidden lg:block">
              <WelcomePreview />
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-white/10 bg-white shadow-xl shadow-black/20 lg:block">
              <div className="border-b border-gray-100 bg-emerald-50 px-5 py-4 sm:px-6">
                <p className="text-sm font-semibold text-gray-900">Vì sao dùng KConnecta?</p>
                <p className="mt-1 text-sm text-gray-500">Những điều bạn có ngay sau khi tham gia</p>
              </div>
              <ul className="divide-y divide-gray-100 px-5 sm:px-6">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <li key={feature.title} className="flex gap-4 py-4 first:pt-4 last:pb-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-gray-900">{feature.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{feature.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
