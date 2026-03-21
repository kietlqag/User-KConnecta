import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
});

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
};