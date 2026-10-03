import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CloudSun, ShoppingCart, Tractor, University, Users, ShieldCheck } from "lucide-react";
import { AdminGate, AdminShell } from "@/components/admin-shell";
import { listFarmers } from "@/lib/fn/profile";
import { listAdminEquipment } from "@/lib/fn/equipment";
import { FEATURE_LABELS, listUsageTotals, type FeatureKey } from "@/lib/fn/usage";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <AdminGate>
      <Overview />
    </AdminGate>
  );
}

function Overview() {
  const user = useCurrentUser();
  const [farmers, setFarmers] = useState(0);
  const [pending, setPending] = useState(0);
  const [approved, setApproved] = useState(0);
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    void listFarmers()
      .then((f) => setFarmers(f.farmers.length))
      .catch(() => undefined);
    void listAdminEquipment({ data: { status: "pending" } })
      .then((p) => setPending(p.items.length))
      .catch(() => undefined);
    void listAdminEquipment({ data: { status: "approved" } })
      .then((a) => setApproved(a.items.length))
      .catch(() => undefined);
    void listUsageTotals()
      .then((rows) => {
        const next: Record<string, number> = {};
        for (const row of rows) next[row.feature] = row.count;
        setUsage(next);
      })
      .catch(() => undefined);
  }, []);

  return (
    <AdminShell title="Admin console" subtitle="Farmers, listings and how the app is used">
      <section className="rounded-3xl bg-zinc-900 px-6 py-6 text-white">
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-900">
          <ShieldCheck className="size-4" />
          You are signed in as admin
        </p>
        <h2 className="mt-3 text-2xl font-bold">{user?.displayName || "Admin"}</h2>
        <p className="mt-1 text-sm text-white/75">
          Delete farmers or machines from Farmers and Listings. Open a farmer for full activity.
        </p>
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat to="/admin/farmers" icon={Users} label="Farmers" value={farmers} />
        <Stat to="/admin/listings" icon={Tractor} label="Waiting review" value={pending} />
        <Stat to="/admin/listings" icon={Tractor} label="Live on yard" value={approved} />
      </div>
      <h3 className="mt-8 mb-3 text-lg font-bold">App use</h3>
      <div className="grid gap-3 sm:grid-cols-5">
        {(
          [
            ["home", Users],
            ["weather", CloudSun],
            ["market", ShoppingCart],
            ["schemes", University],
            ["equipment", Tractor],
          ] as const
        ).map(([key, Icon]) => (
          <div key={key} className="rounded-3xl bg-white p-4 shadow-sm">
            <Icon className="size-4 text-zinc-500" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{usage[key] ?? 0}</p>
            <p className="text-xs text-zinc-500">{FEATURE_LABELS[key as FeatureKey]} opens</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function Stat({
  to,
  icon: Icon,
  label,
  value,
}: {
  to: "/admin/farmers" | "/admin/listings";
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Link to={to} className="rounded-3xl bg-white p-5 shadow-sm">
      <Icon className="size-5 text-zinc-500" />
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </Link>
  );
}
