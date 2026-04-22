import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { loginRequest } from "@/shared/api/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { getAccessToken, setAccessToken } from "@/shared/lib/auth-storage";
import { ApiError } from "@/shared/api/http";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      void navigate("/", { replace: true });
    }
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const res = await loginRequest(email.trim(), password);
      setAccessToken(res.access_token);
      navigate("/", { replace: true });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Не удалось войти";
      setErr(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Вход в LidoCRM</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <label className="block">
              <span className="mb-1 block text-xs text-ink-muted">Email</span>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink-muted">Пароль</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Вход…" : "Войти"}
            </Button>
            <p className="text-center text-xs text-ink-muted">
              Нет аккаунта?{" "}
              <Link to="/register" className="text-ink underline">
                Регистрация
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
