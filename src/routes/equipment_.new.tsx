import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import { addEquipment } from "@/lib/fn/equipment";
import { getProfile } from "@/lib/fn/profile";
import { compressPhoto, MAX_PHOTOS } from "@/lib/photos";
import { EQUIPMENT_CATEGORIES } from "@/lib/utils";

export const Route = createFileRoute("/equipment_/new")({ component: NewPage });

function NewPage() {
  return (
    <AuthWall>
      <NewEquipment />
    </AuthWall>
  );
}

function NewEquipment() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    equipment_name: "",
    category: "Tractor",
    listing_type: "rent" as "rent" | "sale" | "both",
    brand: "",
    description: "",
    buy_price: "",
    rent_per_day: "",
    rent_per_hour: "",
  });

  useEffect(() => {
    void getProfile().catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.listing_type !== "sale" && !form.rent_per_day && !form.rent_per_hour) {
      toast.error("Add a rent price");
      return;
    }
    if (form.listing_type !== "rent" && !form.buy_price) {
      toast.error("Add a sale price");
      return;
    }
    setBusy(true);
    try {
      const res = await addEquipment({
        data: {
          equipment_name: form.equipment_name,
          category: form.category,
          listing_type: form.listing_type,
          brand: form.brand,
          description: form.description,
          buy_price: form.buy_price,
          rent_per_day: form.rent_per_day,
          rent_per_hour: form.rent_per_hour,
          photos,
        },
      });
      toast.success(
        res.status === "approved" ? "Listed on the yard" : "Sent to admin for verification",
      );
      void navigate({ to: "/equipment" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`You can add up to ${MAX_PHOTOS} photos`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    try {
      const next = await Promise.all(picked.map((file) => compressPhoto(file)));
      setPhotos((cur) => [...cur, ...next].slice(0, MAX_PHOTOS));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read photo");
    }
  }

  return (
    <Shell title="Register machine" subtitle="Admin must verify before it appears on the yard">
      <Link to="/equipment" className="text-sm text-primary">
        ← Yard
      </Link>
      <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-5">
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Your listing stays hidden until an admin approves it.
        </p>
        <label className="block text-sm font-medium">
          Name
          <input required value={form.equipment_name} onChange={(e) => set("equipment_name", e.target.value)} className={inCls} />
        </label>
        <label className="block text-sm font-medium">
          Offer
          <select
            value={form.listing_type}
            onChange={(e) => set("listing_type", e.target.value as "rent" | "sale" | "both")}
            className={inCls}
          >
            <option value="rent">Rent only</option>
            <option value="sale">Sale only</option>
            <option value="both">Rent and sale</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Category
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inCls}>
            {EQUIPMENT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Brand
          <input value={form.brand} onChange={(e) => set("brand", e.target.value)} className={inCls} />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className={inCls} rows={3} />
        </label>

        <div>
          <p className="text-sm font-medium">Photos of machine and accessories</p>
          <p className="mt-0.5 text-xs text-muted">
            First photo is the cover. Add extra shots of implements, extras or spare parts. Up to {MAX_PHOTOS}.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((src, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl bg-chip">
                <img src={src} alt={i === 0 ? "Machine" : `Accessory ${i}`} className="h-24 w-full object-cover" />
                <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {i === 0 ? "Machine" : "Accessory"}
                </span>
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-xs text-white"
                  onClick={() => setPhotos((cur) => cur.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <label className="grid h-24 cursor-pointer place-items-center rounded-2xl border border-dashed border-border bg-chip text-center text-xs font-medium text-muted">
                + Add photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {form.listing_type !== "rent" ? (
            <Num label="Sale price" value={form.buy_price} onChange={(v) => set("buy_price", v)} />
          ) : null}
          {form.listing_type !== "sale" ? (
            <>
              <Num label="Rent / day" value={form.rent_per_day} onChange={(v) => set("rent_per_day", v)} />
              <Num label="Rent / hour" value={form.rent_per_hour} onChange={(v) => set("rent_per_hour", v)} />
            </>
          ) : null}
        </div>
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-surface">
          {busy ? "Sending…" : "Send to admin"}
        </button>
      </form>
    </Shell>
  );
}

const inCls = "mt-1 w-full rounded-2xl border-0 bg-chip px-3 py-2.5 ring-1 ring-border";

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={inCls} />
    </label>
  );
}
