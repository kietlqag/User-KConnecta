import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router@7.1.3";
import { Mail, Lock } from "lucide-react";
import { authService } from "@/services/authService";
import { AuthCard } from "../components/AuthCard";
import { AuthInput } from "../components/AuthInput";
import { LoginFormData } from "../types/auth.types";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/home";

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setGoogleError("Thiếu VITE_GOOGLE_CLIENT_ID ở frontend");
      return;
    }

    let cancelled = false;
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts.id || !googleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          if (!credential) {
            setGoogleError("Google không trả về token đăng nhập");
            return;
          }

          setGoogleError(null);
          setIsGoogleLoading(true);

          try {
            const user = await authService.googleLogin(credential);
            authService.saveCurrentUser(user, !!formData.rememberMe);
            navigate(redirectTo, { replace: true });
          } catch (err) {
            setGoogleError(
              err instanceof Error ? err.message : "Đăng nhập Google thất bại"
            );
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        text: "signin_with",
        shape: "rectangular",
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
      script.onerror = () =>
        setGoogleError("Không tải được Google Identity Services");
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (script) {
        script.removeEventListener("load", renderGoogleButton);
      }
    };
  }, [formData.rememberMe, navigate, redirectTo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email) {
      newErrors.email = "Email là bắt buộc";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu là bắt buộc";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    try {
      const user = await authService.login(formData.email, formData.password);
      authService.saveCurrentUser(user, !!formData.rememberMe);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        password: err instanceof Error ? err.message : "Đăng nhập thất bại",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <AuthCard subtitle="Đăng nhập để khám phá thế giới KConnecta">
        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthInput
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail size={20} />}
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />

          <AuthInput
            label="Mật khẩu"
            name="password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={20} />}
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
          />

          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group font-normal">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={!!formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 appearance-none rounded border-2 border-gray-400 bg-white checked:bg-emerald-500 checked:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-all"
                />
                {formData.rememberMe && (
                  <svg
                    className="w-2.5 h-2.5 absolute text-white pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600 flex-1">Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang đăng nhập...
              </span>
            ) : (
              "Đăng nhập"
            )}
          </button>

          <div className="text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Hoặc</span>
            </div>
          </div>

          <div className="space-y-3">
            <div
              ref={googleButtonRef}
              className="flex min-h-[44px] items-center justify-center"
            />
            {isGoogleLoading && (
              <p className="text-center text-sm text-gray-500">
                Đang xác thực với Google...
              </p>
            )}
            {googleError && (
              <p className="text-center text-sm text-red-500">{googleError}</p>
            )}
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Chưa có tài khoản?{" "}
            <Link
              to="/auth/register"
              className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
