import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, Mail } from "lucide-react";
import { authService } from "@/services/authService";
import { AuthInput } from "../components/AuthInput";
import { OTPInput } from "../components/OTPInput";
import { Pupil, EyeBall } from "@/features/auth/components/EyeCharacters";
import { getPasswordChecks } from "@/features/auth/utils/passwordValidation";
import logoV1 from "@/assets/LogoKConnecta_V1.png";

type Step = "email" | "otp" | "reset" | "success";

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

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

  useEffect(() => {
    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (otpExpiresIn > 0) {
      const timer = window.setTimeout(() => setOtpExpiresIn(otpExpiresIn - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [otpExpiresIn]);

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setErrors({ email: "Email là bắt buộc" }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErrors({ email: "Email không hợp lệ" }); return; }
    setIsLoading(true);
    try {
      const { exists } = await authService.checkEmailExists(email);
      if (!exists) { setErrors({ email: "Email chưa có tài khoản" }); return; }
      await authService.sendOtp(email);
      setStep("otp");
      setCountdown(60);
      setOtpExpiresIn(60);
      setErrors({});
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : "Không gửi được mã OTP" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErrors({ otp: "Vui lòng nhập đầy đủ mã OTP" }); return; }
    setIsLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      setStep("reset");
      setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : "Mã OTP không hợp lệ" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const { hasAllRequiredChecks } = getPasswordChecks(password);
    if (!password) newErrors.password = "Mật khẩu là bắt buộc";
    else if (password.length < 8) newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    else if (!hasAllRequiredChecks) newErrors.password = "Mật khẩu phải có chữ hoa, chữ thường và ít nhất một số";
    if (!confirmPassword) newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Mật khẩu không khớp";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setIsLoading(true);
    try {
      await authService.resetPassword(email, password);
      setStep("success");
      setErrors({});
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : "Không đặt lại được mật khẩu" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      await authService.sendOtp(email);
      setCountdown(60);
      setOtpExpiresIn(60);
      setOtp("");
      setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : "Không gửi lại được mã OTP" });
    } finally {
      setIsLoading(false);
    }
  };

  const formattedOtpExpiresIn = `${String(Math.floor(otpExpiresIn / 60)).padStart(2, "0")}:${String(otpExpiresIn % 60).padStart(2, "0")}`;
  const { hasMinLength, hasUpperAndLower, hasNumber, hasAllRequiredChecks } = getPasswordChecks(password);
  const isResetConfirmMatched = confirmPassword.length > 0 && password === confirmPassword;
  const isResetConfirmMismatched = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmitReset = hasAllRequiredChecks && isResetConfirmMatched && !isLoading;

  const spinnerSvg = (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </span>
  );

  const submitBtnClass = "w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

  const renderContent = () => {
    switch (step) {
      case "email":
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Quên mật khẩu</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Nhập email của bạn để nhận mã xác thực</p>
            </div>
            <AuthInput
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail size={20} />}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
              error={errors.email}
            />
            <button type="submit" disabled={isLoading} className={submitBtnClass}>
              {isLoading ? spinnerSvg : "Gửi mã xác thực"}
            </button>
            <Link to="/auth/login" className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100 transition-colors mt-4">
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>
          </form>
        );

      case "otp":
        return (
          <form onSubmit={handleOTPSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Xác thực OTP</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Nhập mã OTP đã được gửi đến</p>
              <p className="text-emerald-600 font-medium mt-1">{email}</p>
            </div>
            <OTPInput value={otp} onChange={(value) => { setOtp(value); setErrors({}); }} error={errors.otp} />
            <button type="submit" disabled={isLoading} className={submitBtnClass}>
              {isLoading ? spinnerSvg : "Xác thực"}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center -mt-2">
              Mã hết hạn sau:{" "}
              <span className={otpExpiresIn > 10 ? "font-semibold text-amber-600" : "font-semibold text-red-500"}>
                {formattedOtpExpiresIn}
              </span>
            </p>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Không nhận được mã?{" "}
                {countdown > 0 ? (
                  <span className="text-gray-400">Gửi lại sau {countdown}s</span>
                ) : (
                  <button type="button" onClick={handleResendOTP} disabled={isLoading} className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors disabled:text-gray-400 disabled:cursor-not-allowed">
                    Gửi lại
                  </button>
                )}
              </p>
            </div>
            <button type="button" onClick={() => setStep("email")} className="flex items-center justify-center gap-2 w-full text-sm text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100 transition-colors">
              <ArrowLeft size={16} />
              Thay đổi email
            </button>
          </form>
        );

      case "reset":
        return (
          <form onSubmit={handleResetSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Đặt lại mật khẩu</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Tạo mật khẩu mới cho tài khoản của bạn</p>
            </div>
            <AuthInput label="Mật khẩu mới" name="password" type="password" placeholder="........" icon={<Lock size={20} />} value={password} onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: "" })); }} error={errors.password} />
            <AuthInput
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              type="password"
              placeholder="........"
              icon={<Lock size={20} />}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: "" })); }}
              error={errors.confirmPassword || (isResetConfirmMismatched ? "Mật khẩu không khớp" : undefined)}
              className={
                isResetConfirmMatched
                  ? "border-green-500 focus:border-green-500 focus:ring-green-200"
                  : isResetConfirmMismatched
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                    : ""
              }
            />
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mật khẩu phải có:</p>
              <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    {hasMinLength && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  Ít nhất 8 ký tự
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasUpperAndLower ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    {hasUpperAndLower && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  Chữ hoa và chữ thường
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    {hasNumber && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  Ít nhất một số
                </li>
              </ul>
            </div>
            <button type="submit" disabled={!canSubmitReset} className={submitBtnClass}>
              {isLoading ? spinnerSvg : "Đặt lại mật khẩu"}
            </button>
          </form>
        );

      case "success":
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-green-600" size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Thành công!</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Mật khẩu của bạn đã được đặt lại thành công</p>
            </div>
            <Link to="/auth/login" className="inline-block w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]">
              Đăng nhập ngay
            </Link>
          </div>
        );

      default:
        return null;
    }
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
                style={{ left: `${45 + purplePos.faceX}px`, top: `${40 + purplePos.faceY}px` }}
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
                style={{ left: `${26 + blackPos.faceX}px`, top: `${32 + blackPos.faceY}px` }}
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
                style={{ left: `${82 + (orangePos.faceX || 0)}px`, top: `${90 + (orangePos.faceY || 0)}px` }}
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
                style={{ left: `${52 + (yellowPos.faceX || 0)}px`, top: `${40 + (yellowPos.faceY || 0)}px` }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
              </div>
              <div
                className="absolute h-[4px] w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out"
                style={{ left: `${40 + (yellowPos.faceX || 0)}px`, top: `${88 + (yellowPos.faceY || 0)}px` }}
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
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <img src={logoV1} alt="KConnecta Logo V1" className="h-10 w-auto" />
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}



