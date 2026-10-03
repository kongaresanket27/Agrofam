import { useEffect } from "react";
import { recordUsage, type FeatureKey } from "@/lib/fn/usage";

export function UsageTracker({ feature }: { feature: FeatureKey }) {
  useEffect(() => {
    void recordUsage({ data: { feature } }).catch(() => undefined);
  }, [feature]);
  return null;
}
