import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminGate, AdminShell } from "@/components/admin-shell";
import { deleteEquipment, listAdminEquipment, reviewEquipment, type Equipment } from "@/lib/fn/equipment";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/listings")({ component: Page });

function Page() {
  return (
    <AdminGate>
      <Listings />
    </AdminGate>
  );
}

function Listings() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [items, setItems] = useState<Equipment[]>([]);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");

  function load(next = tab) {
    setBusy(true);
    void listAdminEquipment({ data: { status: next } })
      .then((res) => setItems(res.items))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const shown = items.filter((item) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${item.equipment_name} ${item.brand} ${item.owner_name} ${item.district}`.toLowerCase().includes(s);
  });

  async function review(id: number, status: "approved" | "rejected") {
    try {
      await reviewEquipment({ data: { id, status } });
      toast.success(status === "approved" ? "Listed on the yard" : "Taken down");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not review");
    }
  }

  async function remove(id: number) {
    if (!confirm("Permanently delete this listing?")) return;
    try {
      await deleteEquipment({ data: { id } });
      toast.success("Listing deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <AdminShell title="Equipment requests" subtitle="Approve, take down or delete listings">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold capitalize",
              tab === k ? "bg-zinc-900 text-white" : "bg-white text-zinc-600",
            )}
          >
            {k}
          </button>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search machine, owner, place…"
        className="mb-4 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-zinc-200"
      />
      {busy ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {!busy && shown.length === 0 ? (
        <p className="text-sm text-zinc-500">No {tab} listings.</p>
      ) : null}
      <ul className="space-y-3">
        {shown.map((item) => (
          <li key={item.id} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {item.photos?.length ? (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {item.photos.map((src, i) => (
                      <div key={i} className="shrink-0">
                        <img
                          src={src}
                          alt={i === 0 ? "Machine" : `Accessory ${i}`}
                          className="h-28 w-28 rounded-2xl object-cover ring-1 ring-zinc-200"
                        />
                        <p className="mt-1 text-center text-[10px] font-semibold uppercase text-zinc-500">
                          {i === 0 ? "Machine" : "Accessory"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-2 text-xs text-zinc-400">No photos uploaded</p>
                )}
                <p className="font-bold">{item.equipment_name}</p>
                <p className="text-sm text-zinc-500">
                  {item.category} · {item.listing_type} · {item.brand || "No brand"}
                </p>
                <p className="mt-1 text-sm">{item.description}</p>
                <p className="mt-2 text-sm font-semibold">
                  {item.rent_per_day ? `₹${item.rent_per_day}/day` : null}
                  {item.rent_per_day && item.buy_price ? " · " : null}
                  {item.buy_price ? `Sale ₹${item.buy_price}` : null}
                </p>
                <p className="text-xs text-zinc-500">
                  {item.owner_name} · {item.owner_mobile} · {[item.village, item.district].filter(Boolean).join(", ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tab === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void review(item.id, "rejected")}
                      className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void review(item.id, "approved")}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>
                  </>
                ) : null}
                {tab === "approved" ? (
                  <button
                    type="button"
                    onClick={() => void review(item.id, "rejected")}
                    className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900"
                  >
                    Take down
                  </button>
                ) : null}
                {tab === "rejected" ? (
                  <button
                    type="button"
                    onClick={() => void review(item.id, "approved")}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
