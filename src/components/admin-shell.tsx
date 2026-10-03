import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Tractor, Users } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/logo";
import { AuthWall } from "@/components/auth-wall";
import { GateSkeleton } from "@/components/shell";
import { getProfile } from "@/lib/fn/profile";
import { coerceAdminFlag, isAdminEmail } from "@/lib/admin-account";
import { useCurrentUser } from "@/lib/auth/use-current-user";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/farmers", label: "Farmers", icon: Users, exact: false },
  { to: "/admin/listings", label: "Listings", icon: Tractor, exact: false },
] as const;

export function AdminGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthWall>
      <AdminCheck>{children}</AdminCheck>
    </AuthWall>
  );
}

function AdminCheck({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const [state, setState] = useState<"load" | "ok" | "no">(
    isAdminEmail(user?.primaryEmail) ? "ok" : "load",
  );

  useEffect(() => {
    if (isAdminEmail(user?.primaryEmail)) {
      setState("ok");
    }
    let alive = true;
    void getProfile()
      .then((p) => {
        if (!alive) return;
        setState(coerceAdminFlag(p.is_admin) || isAdminEmail(user?.primaryEmail) ? "ok" : "no");
      })
      .catch(() => {
        if (!alive) return;
        setState(isAdminEmail(user?.primaryEmail) ? "ok" : "no");
      });
    return () => {
      alive = false;
    };
  }, [user?.id, user?.primaryEmail]);

  if (state === "load") return <GateSkeleton />;
  if (state === "no") return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

export function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-zinc-100">
      <header className="sticky top-0 z-20 bg-zinc-900 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/admin" className="flex items-center gap-2" aria-label="Admin console">
            <Wordmark light />
            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-900">
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
                    active ? "bg-white/15" : "text-white/80 hover:bg-white/10",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <Link
              to="/dashboard"
              search={{ as: "farmer" }}
              className="ml-1 hidden min-h-10 items-center rounded-full px-3 text-sm text-white/80 hover:bg-white/10 sm:inline-flex"
            >
              Farmer app
            </Link>
            <button
              type="button"
              onClick={() => void signOut("/login")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        {title ? (
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
