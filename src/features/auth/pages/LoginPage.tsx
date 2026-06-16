import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, LogOut, MailCheck } from "lucide-react";
import { authService, type AuthUser } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import logoV1 from "@/assets/LogoKConnecta_V1.png";
import { Pupil, EyeBall } from "@/features/auth/components/EyeCharacters";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

function useBlinkTimer(setBlinking: (v: boolean) => void) {
  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => { setBlinking(false); schedule(); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, [setBlinking]);
}

function BlockedLoginContent({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const blockedReason =
    user.blockedReason?.startsWith("Tai khoan cua ban")
      ? "Tài khoản của bạn đang bị khóa tạm thời do bị báo cáo hoặc admin cần xem xét thủ công."
      : user.blockedReason ||
        "Tài khoản có thể đã bị báo cáo, bị admin khóa thủ công, hoặc đang cần xem xét thêm trước khi mở lại.";
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user.email) return;
    setSending(true);
    setMessage("");
    setError("");
    try {
      const response = await authService.requestAccountReview(user.email, reason);
      setMessage(response.message || "Yêu cầu xem xét đã được gửi đến admin.");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu xem xét.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <Lock className="size-7" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">Tài khoản bị khóa tạm thời</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Bạn chưa thể truy cập KConnecta</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{blockedReason}</p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">{user.fullName || user.username || "Người dùng"}</p>
        <p className="mt-1 text-muted-foreground">{user.email}</p>
        <p className="mt-3 leading-6 text-muted-foreground">
          Muốn mở lại tài khoản, bạn cần gửi yêu cầu để admin xem xét. Trong thời gian bị khóa, bạn sẽ không thể vào trang Home hoặc sử dụng các tính năng chính.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Nhập lý do hoặc thông tin bạn muốn admin xem xét..."
          className="min-h-32 resize-none"
        />
        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={sending || !user.email} className="h-12 w-full text-base font-medium">
          <MailCheck className="mr-2 size-4" />
          {sending ? "Đang gửi..." : "Gửi yêu cầu xem xét"}
        </Button>
        <Button type="button" variant="outline" onClick={onLogout} className="h-12 w-full text-base font-medium">
          <LogOut className="mr-2 size-4" />
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const authLockRef = useRef(false);
  const [blockedUser, setBlockedUser] = useState<AuthUser | null>(() => {
    const currentUser = authService.getCurrentUser();
    return currentUser?.accountStatus === "BLOCKED" ? currentUser : null;
  });

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isAuthenticating = isLoading || isGoogleLoading;

  const [showPassword, setShowPassword] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef(0);
  const [, setMouseTick] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/home";

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleError("Thiếu VITE_GOOGLE_CLIENT_ID ở frontend");
      return;
    }

    let cancelled = false;
    let script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          if (authLockRef.current) return;
          if (!credential) {
            setGoogleError("Google không trả về token đăng nhập");
            return;
          }

          authLockRef.current = true;
          setGoogleError(null);
          setIsGoogleLoading(true);
          try {
            const user = await authService.googleLogin(credential);
            if (user.requiresProfileSetup) {
              navigate("/auth/register", {
                replace: true,
                state: {
                  googleSignup: true,
                  googleIdToken: credential,
                  email: user.email,
                },
              });
              return;
            }
            await persistAndHydrateUser(user);
            if (user.accountStatus === "BLOCKED") {
              setBlockedUser(user);
              navigate("/auth/login", { replace: true });
              return;
            }
            navigate(redirectTo, { replace: true });
          } catch (err) {
            setGoogleError(err instanceof Error ? err.message : "Đăng nhập Google thất bại");
          } finally {
            authLockRef.current = false;
            setIsGoogleLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        text: "continue_with",
        shape: "pill",
        size: "large",
        width: Math.min(380, googleButtonRef.current.offsetWidth || 380),
        logo_alignment: "left",
      });
    };

    if (script) {
      script.addEventListener("load", renderGoogleButton);
      renderGoogleButton();
    } else {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => setGoogleError("Không tải được Google Identity Services");
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (script) script.removeEventListener("load", renderGoogleButton);
    };
  }, [formData.rememberMe, navigate, redirectTo]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => setMouseTick(n => n + 1));
    };
    window.addEventListener("mousemove", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  useBlinkTimer(setIsPurpleBlinking);
  useBlinkTimer(setIsBlackBlinking);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(timer);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (formData.password.length > 0 && showPassword) {
      const peekInterval = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => setIsPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);

      return () => clearTimeout(peekInterval);
    }

    setIsPurplePeeking(false);
  }, [formData.password, showPassword, isPurplePeeking]);

  const calculatePosition = (ref: RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseRef.current.x - centerX;
    const deltaY = mouseRef.current.y - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  const validate = (): boolean => {
    if (!formData.email) {
      setError("Email là bắt buộc");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Email không hợp lệ");
      return false;
    }
    if (!formData.password) {
      setError("Mật khẩu là bắt buộc");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }
    return true;
  };

  const persistAndHydrateUser = async (authUser: AuthUser) => {
    if (authUser.accountStatus === "BLOCKED") {
      await authService.logout();
    }
    authService.saveCurrentUser(authUser, !!formData.rememberMe);
    if (authUser.accountStatus === "BLOCKED" || !authUser.token) {
      return;
    }
    try {
      const profile = await authService.getUserById(authUser.id);
      authService.saveCurrentUser(
        {
          ...profile,
          token: authUser.token,
          hasPassword: authUser.hasPassword,
        },
        !!formData.rememberMe,
      );
    } catch {
      // fallback to auth response when profile API is not available
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (authLockRef.current) return;
    setError("");

    if (!validate()) return;

    authLockRef.current = true;
    setIsLoading(true);
    try {
      const user = await authService.login(formData.email, formData.password);
      await persistAndHydrateUser(user);
      if (user.accountStatus === "BLOCKED") {
        setBlockedUser(user);
        navigate("/auth/login", { replace: true });
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      authLockRef.current = false;
      setIsLoading(false);
    }
  };

  const handleBlockedLogout = async () => {
    await authService.logout();
    setBlockedUser(null);
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="grid h-screen overflow-hidden lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          background: '#111126',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        {/* Emerald glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
        />
        <div className="relative z-20">
          <div className="inline-flex items-center rounded-xl bg-white/90 px-3 py-2 shadow-lg shadow-black/20 ring-1 ring-white/70 backdrop-blur-sm">
            <img src={logoV1} alt="KConnecta Logo V1" className="h-9 w-auto" />
          </div>
        </div>

        <div className="relative z-20 flex h-[500px] items-end justify-center">
          <div className="relative" style={{ width: "550px", height: "400px" }}>
            <div
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "70px",
                width: "180px",
                height: isTyping || (formData.password.length > 0 && !showPassword) ? "440px" : "400px",
                backgroundColor: "#6C3FF5",
                borderRadius: "10px 10px 0 0",
                zIndex: 1,
                transform:
                  formData.password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : isTyping || (formData.password.length > 0 && !showPassword)
                      ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                      : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    formData.password.length > 0 && showPassword
                      ? `${20}px`
                      : isLookingAtEachOther
                        ? `${55}px`
                        : `${45 + purplePos.faceX}px`,
                  top:
                    formData.password.length > 0 && showPassword
                      ? `${35}px`
                      : isLookingAtEachOther
                        ? `${65}px`
                        : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={formData.password.length > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={formData.password.length > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={formData.password.length > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={formData.password.length > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              </div>
            </div>

            <div
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "240px",
                width: "120px",
                height: "310px",
                backgroundColor: "#2D2D2D",
                borderRadius: "8px 8px 0 0",
                zIndex: 2,
                transform:
                  formData.password.length > 0 && showPassword
                    ? "skewX(0deg)"
                    : isLookingAtEachOther
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                      : isTyping || (formData.password.length > 0 && !showPassword)
                        ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                        : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left:
                    formData.password.length > 0 && showPassword
                      ? `${10}px`
                      : isLookingAtEachOther
                        ? `${32}px`
                        : `${26 + blackPos.faceX}px`,
                  top:
                    formData.password.length > 0 && showPassword
                      ? `${28}px`
                      : isLookingAtEachOther
                        ? `${12}px`
                        : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={formData.password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={formData.password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={formData.password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={formData.password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              </div>
            </div>

            <div
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "0px",
                width: "240px",
                height: "200px",
                zIndex: 3,
                backgroundColor: "#FF9B6B",
                borderRadius: "120px 120px 0 0",
                transform: formData.password.length > 0 && showPassword ? "skewX(0deg)" : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: formData.password.length > 0 && showPassword ? `${50}px` : `${82 + (orangePos.faceX || 0)}px`,
                  top: formData.password.length > 0 && showPassword ? `${85}px` : `${90 + (orangePos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={formData.password.length > 0 && showPassword ? -5 : undefined} forceLookY={formData.password.length > 0 && showPassword ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={formData.password.length > 0 && showPassword ? -5 : undefined} forceLookY={formData.password.length > 0 && showPassword ? -4 : undefined} />
              </div>
            </div>

            <div
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: "310px",
                width: "140px",
                height: "230px",
                backgroundColor: "#E8D754",
                borderRadius: "70px 70px 0 0",
                zIndex: 4,
                transform: formData.password.length > 0 && showPassword ? "skewX(0deg)" : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: formData.password.length > 0 && showPassword ? `${20}px` : `${52 + (yellowPos.faceX || 0)}px`,
                  top: formData.password.length > 0 && showPassword ? `${35}px` : `${40 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={formData.password.length > 0 && showPassword ? -5 : undefined} forceLookY={formData.password.length > 0 && showPassword ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={formData.password.length > 0 && showPassword ? -5 : undefined} forceLookY={formData.password.length > 0 && showPassword ? -4 : undefined} />
              </div>
              <div
                className="absolute h-[4px] w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out"
                style={{
                  left: formData.password.length > 0 && showPassword ? `${10}px` : `${40 + (yellowPos.faceX || 0)}px`,
                  top: formData.password.length > 0 && showPassword ? `${88}px` : `${88 + (yellowPos.faceY || 0)}px`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-primary-foreground/60">
          <a href="#" className="transition-colors hover:text-primary-foreground">Chính sách bảo mật</a>
          <a href="#" className="transition-colors hover:text-primary-foreground">Điều khoản dịch vụ</a>
          <a href="#" className="transition-colors hover:text-primary-foreground">Liên hệ</a>
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute right-1/4 top-1/4 size-64 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>

      <div className="scrollbar-none flex items-center justify-center overflow-y-auto bg-background p-8">
        <div className="relative w-full max-w-[420px]">
          {isAuthenticating && <div className="absolute inset-0 z-20 cursor-wait" />}
          <div className="mb-12 flex items-center justify-center lg:hidden">
            <img src={logoV1} alt="KConnecta Logo V1" className="h-10 w-auto" />
          </div>

          {blockedUser ? (
            <BlockedLoginContent user={blockedUser} onLogout={handleBlockedLogout} />
          ) : (
            <>
              <div className="mb-10 text-center">
                <h1 className="mb-2 text-3xl font-bold tracking-tight">Chào mừng bạn quay lại!</h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="anna@gmail.com"
                      value={formData.email}
                      autoComplete="off"
                      disabled={isAuthenticating}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      onFocus={() => setIsTyping(true)}
                      onBlur={() => setIsTyping(false)}
                      required
                      className="h-12 border-border/60 bg-background pl-10 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      disabled={isAuthenticating}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      className="h-12 border-border/60 bg-background pl-10 pr-10 focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={isAuthenticating}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      disabled={isAuthenticating}
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, rememberMe: checked === true }))}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">Ghi nhớ đăng nhập</Label>
                  </div>
                  <Link
                    to="/auth/forgot-password"
                    className={`text-sm font-medium text-primary hover:underline ${isAuthenticating ? "pointer-events-none opacity-50" : ""}`}
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                {error && <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">{error}</div>}

                <Button type="submit" className="h-12 w-full text-base font-medium" size="lg" disabled={isAuthenticating}>
                  {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </form>

              <div className="my-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground">Hoặc</span>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  ref={googleButtonRef}
                  className={`flex min-h-[44px] items-center justify-center ${isAuthenticating ? "pointer-events-none opacity-60" : ""}`}
                />
                {isGoogleLoading && <p className="text-center text-sm text-muted-foreground">Đang xác thực với Google...</p>}
                {googleError && <p className="text-center text-sm text-red-500">{googleError}</p>}
              </div>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                Chưa có tài khoản? {" "}
                <Link
                  to="/auth/register"
                  className={`font-medium text-foreground hover:underline ${isAuthenticating ? "pointer-events-none opacity-50" : ""}`}
                >
                  Đăng ký ngay
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
