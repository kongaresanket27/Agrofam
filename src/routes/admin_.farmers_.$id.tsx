import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminGate, AdminShell } from "@/components/admin-shell";
import { deleteFarmer, getFarmerAdmin, type FarmerAdminDetail } from "@/lib/fn/profile";
import { deleteEquipment } from "@/lib/fn/equipment";
import { FEATURE_LABELS, type FeatureKey } from "@/lib/fn/usage";
import { isAdminEmail } from "@/lib/admin-account";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin_/farmers_/$id")({ component: Page });

function Page() {
  return (
    <AdminGate>
      <FarmerDetail />
    </AdminGate>
  );
}

function labelOf(feature: string) {
  return FEATURE_LABELS[feature as FeatureKey] ?? feature;
}

function FarmerDetail() {
  const { id } = Route.useParams();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const [data, setData] = useState<FarmerAdminDetail | null | undefined>(undefined);

  function load() {
    void getFarmerAdmin({ data: { userId: id } })
      .then(setData)
      .catch(() => setData(null));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function removeUser() {
    if (!data) return;
    if (data.profile.user_id === me?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (isAdminEmail(data.email)) {
      toast.error("The main admin account cannot be deleted");
      return;
    }
    if (!confirm("Delete this farmer, their usage and all listings?")) return;
    try {
      await deleteFarmer({ data: { userId: data.profile.user_id } });
      toast.success("Farmer deleted");
      void navigate({ to: "/admin/farmers" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function removeListing(listingId: number) {
    if (!confirm("Delete this equipment listing?")) return;
    try {
      await deleteEquipment({ data: { id: listingId } });
      toast.success("Listing deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  if (data === undefined) {
    return (
      <AdminShell title="Farmer">
        <p className="text-sm text-zinc-500">Loading…</p>
      </AdminShell>
    );
  }
  if (!data) {
    return (
      <AdminShell title="Farmer">
        <p className="text-sm text-zinc-500">Farmer not found.</p>
      </AdminShell>
    );
  }

  const p = data.profile;
  const usageMap = Object.fromEntries(data.usage.map((u) => [u.feature, u]));
  const features: FeatureKey[] = ["home", "weather", "market", "schemes", "equipment"];

  return (
    <AdminShell title={p.full_name || "Farmer"} subtitle={data.email || "No email"}>
      <Link to="/admin/farmers" className="mb-4 inline-block text-sm text-zinc-500">
        ← All farmers
      </Link>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">
              {p.is_admin ? "Admin" : "Farmer"} · {p.mobile_number || "No mobile"}
            </p>
            <p className="mt-1 text-sm">
              {[p.village, p.taluka, p.district, p.state, p.pincode].filter(Boolean).join(", ") || "No address"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Crop {p.main_crop || "—"} · land {p.land_area || "—"} acres · Farmer ID {p.farmer_id || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void removeUser()}
            className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800"
          >
            Delete user
          </button>
        </div>
      </section>

      <h2 className="mt-6 mb-3 text-lg font-bold">Feature use</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {features.map((key) => {
          const row = usageMap[key];
          return (
            <li key={key} className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{labelOf(key)}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">{row?.count ?? 0}</p>
              <p className="text-xs text-zinc-500">
                {row?.last_used_at ? `Last ${new Date(row.last_used_at).toLocaleString()}` : "Never"}
              </p>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-6 mb-3 text-lg font-bold">Equipment listings</h2>
      {data.listings.length === 0 ? (
        <p className="text-sm text-zinc-500">No machines listed.</p>
      ) : (
        <ul className="space-y-2">
          {data.listings.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="font-semibold">{item.equipment_name}</p>
                <p className="text-xs text-zinc-500">
                  {item.category} · {item.listing_type} · {item.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeListing(item.id)}
                className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
