import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";

import { meRequest } from "@/shared/api/auth";
import { clearAccessToken, getAccessToken } from "@/shared/lib/auth-storage";

export function RequireAuth() {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const { isLoading, isError, data } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: meRequest,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Загрузка…
      </div>
    );
  }
  if (isError || !data) {
    clearAccessToken();
    return <Navigate to="/login" replace />;
  }
  return <Outlet context={{ user: data }} />;
}
