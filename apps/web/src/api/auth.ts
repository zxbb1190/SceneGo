import type { User } from "@scenego/shared";
import { apiRequest } from "./http.js";

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface AuthInput {
  email: string;
  password: string;
  nickname?: string;
}

export function login(input: AuthInput) {
  return apiRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    json: {
      email: input.email,
      password: input.password
    }
  });
}

export function register(input: AuthInput) {
  return apiRequest<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    json: input
  });
}

export function loadMe(token: string) {
  return apiRequest<{ user: User }>("/api/v1/auth/me", { token });
}

