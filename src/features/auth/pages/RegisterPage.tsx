import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Pupil, EyeBall } from "@/features/auth/components/EyeCharacters";
import { ShieldCheck, User, MessageSquare, Database } from "lucide-react";
import { EmailStep, OTPVerificationStep, PasswordStep, ProfileSetupStep } from "../components/signup-steps";
import { resolveGoogleSignupSession, clearGoogleSignupSession } from "../utils/googleSignupSession";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import logoV1 from "@/assets/LogoKConnecta_V1.png";

type SignupStep = "email" | "otp" | "password" | "profile";

interface SignupData {
  email: string;
  password: string;
}

export function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const googleSignupSession = useMemo(
    () =>
      resolveGoogleSignupSession(
        location.state as {
          googleSignup?: boolean;
          googleIdToken?: string;
          googleAccessToken?: string;
          email?: string;
          suggestedName?: string;
        } | null,
      ),
    [location.state],
  );
  const isGoogleSignup = Boolean(googleSignupSession);

  const [isConsentOpen, setIsConsentOpen] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  const handleCancelConsent = () => {
    setIsConsentOpen(false);
    clearGoogleSignupSession();
    navigate("/auth/login", { replace: true });
  };

  const handleAcceptConsent = () => {
    setIsConsentOpen(false);
    setHasConsented(true);
  };

  const [currentStep, setCurrentStep] = useState<SignupStep>(isGoogleSignup ? "profile" : "email");
  const [signupData, setSignupData] = useState<SignupData>({
    email: googleSignupSession?.email ?? "",
    password: "",
  });
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);

  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const scheduleBlink = () => {
      const t = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => { setIsPurpleBlinking(false); scheduleBlink(); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = scheduleBlink();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const scheduleBlink = () => {
      const t = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => { setIsBlackBlinking(false); scheduleBlink(); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = scheduleBlink();
    return () => clearTimeout(t);
  }, []);

  const calculatePosition = (ref: RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  const handleEmailNext = (email: string) => {
    setSignupData((prev) => ({ ...prev, email }));
    setOtpSentAt(Date.now());
    setCurrentStep("otp");
  };
  const handleOTPNext = () => setCurrentStep("password");
  const handlePasswordNext = (password: string) => {
    setSignupData((prev) => ({ ...prev, password }));
    setCurrentStep("profile");
  };

  useEffect(() => {
    if (!googleSignupSession) return;
    setSignupData((prev) =>
      prev.email === googleSignupSession.email ? prev : { ...prev, email: googleSignupSession.email },
    );
    setCurrentStep("profile");
  }, [googleSignupSession]);

  const handleGoogleSignupBack = () => {
    clearGoogleSignupSession();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{
          background: '#111126',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
        />
        <div className="relative z-20">
          <div className="inline-flex items-center rounded-xl bg-card/90 px-3 py-2 shadow-lg shadow-black/20 ring-1 ring-white/70 backdrop-blur-sm">
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
                height: "400px",
                backgroundColor: "#6C3FF5",
                borderRadius: "10px 10px 0 0",
                zIndex: 1,
                transform: `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left: `${45 + purplePos.faceX}px`,
                  top: `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} />
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
                transform: `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: `${26 + blackPos.faceX}px`,
                  top: `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking} />
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
                transform: `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: `${82 + (orangePos.faceX || 0)}px`,
                  top: `${90 + (orangePos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
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
                transform: `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: `${52 + (yellowPos.faceX || 0)}px`,
                  top: `${40 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
              </div>
              <div
                className="absolute h-[4px] w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out"
                style={{
                  left: `${40 + (yellowPos.faceX || 0)}px`,
                  top: `${88 + (yellowPos.faceY || 0)}px`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-primary-foreground/60">
          <Link to="/privacy" className="transition-colors hover:text-primary-foreground">Chính sách bảo mật</Link>
          <Link to="/terms" className="transition-colors hover:text-primary-foreground">Điều khoản dịch vụ</Link>
          <Link to="/contact" className="transition-colors hover:text-primary-foreground">Liên hệ</Link>
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute right-1/4 top-1/4 size-64 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <img src={logoV1} alt="KConnecta Logo V1" className="h-10 w-auto" />
          </div>

          {currentStep === "email" && (
            <EmailStep onNext={handleEmailNext} initialEmail={signupData.email} />
          )}
          {currentStep === "otp" && (
            <OTPVerificationStep
              email={signupData.email}
              otpSentAt={otpSentAt}
              onResendSuccess={setOtpSentAt}
              onNext={handleOTPNext}
              onBack={() => setCurrentStep("email")}
            />
          )}
          {currentStep === "password" && (
            <PasswordStep 
              initialPassword={signupData.password}
              onNext={handlePasswordNext} 
              onBack={() => {
                setSignupData((prev) => ({ ...prev, password: "" }));
                setCurrentStep("otp");
              }} 
            />
          )}
          {currentStep === "profile" && (
            <ProfileSetupStep
              email={signupData.email}
              password={signupData.password}
              isGoogleSignup={isGoogleSignup}
              googleIdToken={googleSignupSession?.googleIdToken}
              googleAccessToken={googleSignupSession?.googleAccessToken}
              googleSuggestedName={googleSignupSession?.suggestedName}
              onBack={isGoogleSignup ? handleGoogleSignupBack : () => setCurrentStep("password")}
            />
          )}

          {currentStep === "email" && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link to="/auth/login" className="font-medium text-foreground hover:underline">
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>

      {isConsentOpen && (
        <Dialog open={isConsentOpen} onOpenChange={(open) => { if (!open) handleCancelConsent(); }}>
          <DialogContent 
            className="sm:max-w-lg bg-card border-border shadow-2xl p-5 rounded-2xl"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader className="space-y-2 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5.5 w-5.5" />
              </div>
              <DialogTitle className="text-center text-lg font-bold text-foreground">
                Điều khoản dữ liệu & Quyền riêng tư
              </DialogTitle>
            </DialogHeader>

            <div className="text-sm leading-relaxed space-y-3 px-1 py-1 text-muted-foreground">
              <p className="text-foreground/90 font-medium text-center text-xs leading-relaxed px-4">
                Bằng việc nhấn <strong className="text-primary font-semibold">Tiếp tục</strong>, bạn đồng ý cho phép KConnecta thu thập và xử lý các dữ liệu của bạn để phục vụ các dịch vụ trên hệ thống:
              </p>
              
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-start gap-3 text-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-xs">Thông tin cá nhân</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">Email, Họ tên, Ảnh đại diện để thiết lập tài khoản và hồ sơ cá nhân.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm border-t border-border/50 pt-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-xs">Nội dung & Hoạt động</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">Các bài viết, bình luận, tin nhắn và hoạt động tương tác của bạn.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm border-t border-border/50 pt-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-xs">Dữ liệu hệ thống</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">Thông tin thiết bị, địa chỉ IP nhằm bảo mật và tối ưu hệ thống.</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] leading-normal pt-1 text-center px-4">
                Chúng tôi cam kết bảo mật thông tin theo đúng{" "}
                <Link to="/privacy" target="_blank" className="font-semibold text-primary hover:underline">Chính sách bảo mật</Link> và{" "}
                <Link to="/terms" target="_blank" className="font-semibold text-primary hover:underline">Điều khoản dịch vụ</Link> của chúng tôi.
              </p>
            </div>

            <div className="flex items-start space-x-2.5 py-1 px-1 mt-1">
              <Checkbox
                id="consent-checkbox"
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
                className="mt-0.5 cursor-pointer border-primary/50 shrink-0"
              />
              <label htmlFor="consent-checkbox" className="cursor-pointer text-xs font-semibold leading-relaxed text-foreground select-none">
                Tôi đồng ý cho phép KConnecta thu thập và xử lý các dữ liệu của tôi như nêu trên.
              </label>
            </div>

            <DialogFooter className="gap-2.5 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelConsent}
                className="h-10 rounded-[8px] border-border hover:bg-muted text-foreground text-xs px-5"
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={!consentChecked}
                onClick={handleAcceptConsent}
                className="h-10 rounded-[8px] bg-primary text-white hover:bg-primary/95 disabled:opacity-50 text-xs px-5"
              >
                Tiếp tục
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
