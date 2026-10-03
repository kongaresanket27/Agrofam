import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Combine, Droplets, Settings, Star, Tractor } from "lucide-react";
import { toast } from "sonner";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import { UsageTracker } from "@/components/usage-tracker";
import { listEquipment, listMyEquipment, resubmitEquipment, type Equipment } from "@/lib/fn/equipment";
import { t, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/equipment")({ component: EquipmentPage });

function EquipmentPage() {
  return (
    <AuthWall>
      <UsageTracker feature="equipment" />
      <EquipmentList />
    </AuthWall>
  );
}

function banner(item: Equipment) {
  const c = item.category.toLowerCase();
  if (c.includes("harvest")) return { cls: "from-emerald-400 to-green-600", Icon: Combine };
  if (c.includes("spray")) return { cls: "from-cyan-400 to-sky-500", Icon: Droplets };
  if (c.includes("implement") || c.includes("rotav")) return { cls: "from-blue-400 to-indigo-500", Icon: Settings };
  return { cls: "from-amber-300 to-orange-400", Icon: Tractor };
}

function rating(id: number) {
  const r = 4.2 + ((id * 17) % 8) / 10;
  const n = 12 + ((id * 13) % 40);
  return { r: r.toFixed(1), n };
}

function statusCls(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-900";
}

function EquipmentList() {
  const { lang } = useI18n();
  const [items, setItems] = useState<Equipment[]>([]);
  const [mine, setMine] = useState<Equipment[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void Promise.all([listEquipment({ data: {} }), listMyEquipment()])
      .then(([rows, own]) => {
        setItems(rows);
        setMine(own);
      })
      .finally(() => setBusy(false));
  }, []);

  return (
    <Shell title={t(lang, "farmEquipment")} subtitle={t(lang, "farmEquipmentSub")} backTo="/dashboard">
      <div className="mb-4 flex justify-end">
        <Link
          to="/equipment/new"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Register machine
        </Link>
      </div>
      {mine.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Your listings</h2>
          <ul className="space-y-2">
            {mine.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 card-shadow"
              >
                <div>
                  <p className="font-semibold">{item.equipment_name}</p>
                  <p className="text-xs text-muted">
                    {item.listing_type} · {item.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "rejected" ? (
                    <button
                      type="button"
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => {
                        void resubmitEquipment({ data: { id: item.id } })
                          .then(() => {
                            toast.success("Sent to admin again");
                            setMine((rows) =>
                              rows.map((r) => (r.id === item.id ? { ...r, status: "pending" } : r)),
                            );
                          })
                          .catch((err) =>
                            toast.error(err instanceof Error ? err.message : "Could not resubmit"),
                          );
                      }}
                    >
                      Send again
                    </button>
                  ) : null}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusCls(item.status)}`}>
                    {item.status === "pending" ? "Waiting for admin" : item.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {busy ? <p className="text-sm text-muted">Loading…</p> : null}
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Available on the yard</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const b = banner(item);
          const rt = rating(item.id);
          return (
            <li key={item.id} className="card-shadow overflow-hidden rounded-3xl bg-surface">
              {item.photos?.[0] ? (
                <img src={item.photos[0]} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className={`grid h-28 place-items-center bg-linear-to-br ${b.cls} text-white`}>
                  <b.Icon className="size-12" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold">{item.equipment_name}</h2>
                    <p className="text-sm text-muted">{item.brand}</p>
                  </div>
                  <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-semibold capitalize">
                    {item.listing_type}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-accent">
                  <Star className="size-3.5 fill-current" /> {rt.r} ({rt.n})
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description}</p>
                <p className="mt-3 flex justify-between text-sm font-semibold">
                  <span>{item.rent_per_day ? `₹${item.rent_per_day}/day` : "For sale"}</span>
                  <span className="text-muted font-normal">
                    {item.buy_price ? `₹${item.buy_price}` : item.rent_per_hour ? `₹${item.rent_per_hour}/hr` : ""}
                  </span>
                </p>
                <Link
                  to="/equipment/$id"
                  params={{ id: String(item.id) }}
                  className="mt-3 flex min-h-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white"
                >
                  {t(lang, "viewDetails")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {!busy && items.length === 0 ? (
        <p className="text-sm text-muted">No approved machines yet. Register yours to send a request to admin.</p>
      ) : null}
    </Shell>
  );
}
