const KEY = "lidocrm_access_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(KEY);
}

export function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/register";
}
