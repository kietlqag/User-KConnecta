import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  sendOtp: (email: string) =>
    api.post("/auth/send-otp", { email }),

  verifyOtp: (email: string, otp: string) =>
    api.post("/auth/verify-otp", { email, otp }),

  register: (data: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    dateOfBirth?: string;
    gender: string;
    location?: string;
    bio?: string;
  }) => api.post("/auth/register", data),

  resetPassword: (email: string, newPassword: string) =>
    api.post("/auth/reset-password", { email, newPassword }),
};
