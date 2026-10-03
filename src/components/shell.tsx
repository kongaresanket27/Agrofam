import { Link, useRouterState } from "@tanstack/react-router";
import {
  CloudSun,
  Headphones,
  Home,
  LogOut,
  ShoppingCart,
  Tractor,
  University,
  UserRound,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/logo";
import { t, useI18n, type Lang } from "@/lib/i18n";

const NAV = [
  { to: "/dashboard", key: "home", icon: Home },
  { to: "/weather", key: "weather", icon: CloudSun },
  { to: "/support", key: "support", icon: Headphones },
  { to: "/profile", key: "profile", icon: UserRound },
] as const;

export function Shell({
  children,
  title,
  subtitle,
  backTo,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  backTo?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { lang, setLang } = useI18n();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 bg-header text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/dashboard" aria-label="AgroFam home">
            <Wordmark light />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.to === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
                    active ? "bg-white/20" : "text-white/85 hover:bg-white/10",
                  )}
                >
                  <Icon className="size-4" />
                  {t(lang, item.key)}
                </Link>
              );
            })}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="ml-1 min-h-10 rounded-full bg-white/15 px-3 text-sm text-white"
              aria-label="Language"
            >
              <option value="en" className="text-fg">
                EN
              </option>
              <option value="hi" className="text-fg">
                हिं
              </option>
              <option value="mr" className="text-fg">
                मरा
              </option>
            </select>
            <button
              type="button"
              onClick={() => void signOut("/login")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              <LogOut className="size-4" />
              {t(lang, "logout")}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:pb-12">
        {backTo ? (
          <Link to={backTo} className="mb-3 inline-flex items-center text-sm font-medium text-muted">
            ← {t(lang, "back")}
          </Link>
        ) : null}
        {title ? (
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {[
            { to: "/dashboard", key: "home", icon: Home },
            { to: "/market", key: "marketRate", icon: ShoppingCart },
            { to: "/weather", key: "weather", icon: CloudSun },
            { to: "/schemes", key: "subsidy", icon: University },
            { to: "/equipment", key: "equipment", icon: Tractor },
          ].map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon className="size-5" />
                  {t(lang, item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function GateSkeleton() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="h-10 w-48 animate-pulse rounded-full bg-border" />
    </div>
  );
}

export const fieldCls =
  "mt-1 w-full rounded-2xl border-0 bg-chip px-4 py-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-2 focus:ring-primary";
export const btnCls =
  "inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50";
