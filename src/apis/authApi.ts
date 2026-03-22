import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  // Thêm các API cho forgot password
  sendOtp: (email: string) =>
    api.post("/auth/send-otp", { email }),
    
  verifyOtp: (email: string, otp: string) =>
    api.post("/auth/verify-otp", { email, otp }),
    
  resetPassword: (email: string, newPassword: string) =>
    api.post("/auth/reset-password", { email, newPassword }),
};