import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGate, AdminShell } from "@/components/admin-shell";
import { deleteFarmer, listFarmers, type FarmerListRow } from "@/lib/fn/profile";
import { isAdminEmail } from "@/lib/admin-account";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin_/farmers")({ component: Page });

function Page() {
  return (
    <AdminGate>
      <Farmers />
    </AdminGate>
  );
}

function Farmers() {
  const me = useCurrentUser();
  const [rows, setRows] = useState<FarmerListRow[]>([]);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    void listFarmers()
      .then((res) => setRows(res.farmers))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load farmers"));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((f) =>
      `${f.full_name} ${f.email} ${f.mobile_number} ${f.district} ${f.village}`.toLowerCase().includes(s),
    );
  }, [rows, q]);

  async function remove(f: FarmerListRow) {
    if (f.user_id === me?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (isAdminEmail(f.email)) {
      toast.error("The main admin account cannot be deleted");
      return;
    }
    if (!confirm(`Delete ${f.full_name || f.email || "this farmer"} and their listings?`)) return;
    setBusyId(f.user_id);
    try {
      await deleteFarmer({ data: { userId: f.user_id } });
      toast.success("Farmer deleted");
      setRows((cur) => cur.filter((r) => r.user_id !== f.user_id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell title="Farmers" subtitle="Accounts, activity and listings">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, village…"
        className="mb-4 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-zinc-200"
      />
      <ul className="space-y-3">
        {filtered.map((f) => (
          <li key={f.user_id} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {f.full_name || "Unnamed"}{" "}
                  {f.is_admin ? (
                    <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-bold uppercase text-amber-300">
                      Admin
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                      Farmer
                    </span>
                  )}
                </p>
                <p className="text-sm text-zinc-500">{f.email || "No email"}</p>
                <p className="text-sm text-zinc-500">
                  {f.mobile_number || "No mobile"} · {[f.village, f.district, f.state].filter(Boolean).join(", ")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Crop: {f.main_crop || "—"} · {f.listing_count} listings · {f.visit_count} feature uses
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/admin/farmers/$id"
                  params={{ id: f.user_id }}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Details
                </Link>
                <button
                  type="button"
                  disabled={busyId === f.user_id}
                  onClick={() => void remove(f)}
                  className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? <p className="text-sm text-zinc-500">No farmers match.</p> : null}
    </AdminShell>
  );
}
