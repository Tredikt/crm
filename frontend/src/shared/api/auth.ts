import { apiRequest } from "@/shared/api/http";

export type UserMe = {
  id: number;
  email: string;
  telegram_user_id: number | null;
};

export async function updateMeRequest(patch: { telegram_user_id: number | null }) {
  return apiRequest<UserMe>("/auth/me", { method: "PATCH", json: patch });
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export async function loginRequest(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    json: { email, password },
  });
}

export async function registerRequest(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/auth/register", {
    method: "POST",
    json: { email, password },
  });
}

export async function meRequest(): Promise<UserMe> {
  return apiRequest<UserMe>("/auth/me", { method: "GET" });
}
