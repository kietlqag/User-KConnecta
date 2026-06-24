import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Pupil, EyeBall } from "@/features/auth/components/EyeCharacters";
import { EmailStep, OTPVerificationStep, PasswordStep, ProfileSetupStep } from "../components/signup-steps";
import { resolveGoogleSignupSession, clearGoogleSignupSession } from "../utils/googleSignupSession";
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

  const [currentStep, setCurrentStep] = useState<SignupStep>(isGoogleSignup ? "profile" : "email");
  const [signupData, setSignupData] = useState<SignupData>({
    email: googleSignupSession?.email ?? "",
    password: "",
  });

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
          <div className="inline-flex items-center rounded-xl bg-white dark:bg-gray-800/90 px-3 py-2 shadow-lg shadow-black/20 ring-1 ring-white/70 backdrop-blur-sm">
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
              onNext={handleOTPNext}
              onBack={() => setCurrentStep("email")}
            />
          )}
          {currentStep === "password" && (
            <PasswordStep onNext={handlePasswordNext} onBack={() => setCurrentStep("otp")} />
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
    </div>
  );
}
