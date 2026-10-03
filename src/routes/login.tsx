import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { Mark } from "@/components/logo";
import { t, useI18n, type Lang } from "@/lib/i18n";
import { getProfile } from "@/lib/fn/profile";
import { isAdminEmail, isAdminLogin, loginEmailOf } from "@/lib/admin-account";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

export function LoginPage() {
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const raw = email.trim();
      const loginEmail = loginEmailOf(raw);
      const res = await authClient.signIn.email({ email: loginEmail, password });
      if (res.error) {
        toast.error(res.error.message ?? "Could not sign in");
        return;
      }
      toast.success("Welcome back");
      const signedEmail = res.data?.user?.email ?? loginEmail;
      if (isAdminLogin(raw) || isAdminEmail(signedEmail)) {
        void navigate({ to: "/admin" });
        return;
      }
      const profile = await getProfile().catch(() => null);
      void navigate({
        to: profile?.is_admin ? "/admin" : "/dashboard",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-band grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/10">
          <Mark className="size-14" />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-white">AgroFam</h1>
        <p className="mt-1 text-sm text-white/80">{t(lang, "brandSub")}</p>

        <div className="mt-6 flex justify-center gap-2">
          {(
            [
              ["en", "English"],
              ["hi", "हिंदी"],
              ["mr", "मराठी"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code as Lang)}
              className={
                lang === code
                  ? "rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-primary"
                  : "rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white"
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="card-shadow mt-6 rounded-3xl bg-surface p-6 text-left">
          <h2 className="text-xl font-bold">{t(lang, "welcomeBack")}</h2>
          <p className="mt-1 text-sm text-muted">{t(lang, "signInHint")}</p>

          {authEnabled ? (
            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm font-semibold">
                {t(lang, "email")}
                <span className="mt-1 flex items-center gap-2 rounded-2xl bg-chip px-3 ring-1 ring-border">
                  <Mail className="size-4 text-muted" />
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t(lang, "emailPh")}
                    className="min-h-12 flex-1 bg-transparent text-sm outline-none"
                  />
                </span>
              </label>
              <label className="block text-sm font-semibold">
                {t(lang, "password")}
                <span className="mt-1 flex items-center gap-2 rounded-2xl bg-chip px-3 ring-1 ring-border">
                  <Lock className="size-4 text-muted" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(lang, "passwordPh")}
                    className="min-h-12 flex-1 bg-transparent text-sm outline-none"
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label="Show password">
                    {show ? <EyeOff className="size-4 text-muted" /> : <Eye className="size-4 text-muted" />}
                  </button>
                </span>
              </label>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  {t(lang, "remember")}
                </label>
                <button
                  type="button"
                  className="font-medium text-primary"
                  onClick={() => toast.message("Ask your admin to reset the password, or register a new account.")}
                >
                  {t(lang, "forgot")}
                </button>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "…" : t(lang, "login")}
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
          )}

          <p className="mt-4 text-center text-sm text-muted">
            {t(lang, "noAccount")}{" "}
            <Link to="/register" className="font-semibold text-primary">
              {t(lang, "register")}
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted">
            Accounts stay on AgroFam. We do not sign in with Google or X.
          </p>
        </div>
        <p className="mt-6 text-xs text-white/70">{t(lang, "version")}</p>
      </div>
    </main>
  );
}
