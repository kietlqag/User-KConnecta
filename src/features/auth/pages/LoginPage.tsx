import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { authService, type AuthUser } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const authLockRef = useRef(false);

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
    authService.saveCurrentUser(authUser, !!formData.rememberMe);
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
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      authLockRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-12 text-white lg:flex">
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

      <div className="flex items-center justify-center bg-background p-8">
        <div className="relative w-full max-w-[420px]">
          {isAuthenticating && <div className="absolute inset-0 z-20 cursor-wait" />}
          <div className="mb-12 flex items-center justify-center lg:hidden">
            <img src={logoV1} alt="KConnecta Logo V1" className="h-10 w-auto" />
          </div>

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
        </div>
      </div>
    </div>
  );
}
