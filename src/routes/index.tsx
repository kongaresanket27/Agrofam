import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getProfile } from "@/lib/fn/profile";
import { coerceAdminFlag, isAdminEmail } from "@/lib/admin-account";
import { LoginPage } from "./login";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending, user } = useCurrentUserState();
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setAdmin(null);
      return;
    }
    if (isAdminEmail(user.primaryEmail)) {
      setAdmin(true);
      return;
    }
    void getProfile()
      .then((p) => setAdmin(coerceAdminFlag(p.is_admin) || isAdminEmail(user.primaryEmail)))
      .catch(() => setAdmin(isAdminEmail(user.primaryEmail)));
  }, [user]);

  if (isPending || (user && admin === null)) {
    return (
      <div className="login-band grid min-h-dvh place-items-center">
        <div className="h-10 w-40 animate-pulse rounded-full bg-white/20" />
      </div>
    );
  }
  if (user) return <Navigate to={admin ? "/admin" : "/dashboard"} />;
  return <LoginPage />;
}
