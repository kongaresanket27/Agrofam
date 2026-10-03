import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GateSkeleton } from "@/components/shell";

export function AuthWall({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <GateSkeleton />;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
