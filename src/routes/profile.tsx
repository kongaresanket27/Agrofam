import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import { getProfile, saveProfile } from "@/lib/fn/profile";
import { districtsOf, locationData, stateNames, talukasOf } from "@/data/location-data";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  return (
    <AuthWall>
      <Profile />
    </AuthWall>
  );
}

function Profile() {
  const states = stateNames();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    farmer_id: "",
    village: "",
    state: "Maharashtra",
    district: "Pune",
    taluka: "Haveli",
    pincode: "",
    land_area: "",
    main_crop: "",
    gender: "",
  });

  useEffect(() => {
    void getProfile().then((p) => {
      setForm({
        full_name: p.full_name ?? "",
        mobile_number: p.mobile_number ?? "",
        farmer_id: p.farmer_id ?? "",
        village: p.village ?? "",
        state: p.state || "Maharashtra",
        district: p.district || "Pune",
        taluka: p.taluka || "Haveli",
        pincode: p.pincode ?? "",
        land_area: p.land_area ?? "",
        main_crop: p.main_crop ?? "",
        gender: p.gender ?? "",
      });
    });
  }, []);

  const districts = districtsOf(form.state);
  const talukas = talukasOf(form.state, form.district);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.mobile_number && !/^[6-9]\d{9}$/.test(form.mobile_number)) {
      toast.error("Mobile must be a 10-digit Indian number");
      return;
    }
    setBusy(true);
    try {
      await saveProfile({ data: form });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Your farm profile">
      <div className="mb-4 flex items-center justify-end gap-4 rounded-3xl bg-surface p-3 card-shadow">
        <Link to="/notifications" className="text-sm font-semibold text-primary">
          Alerts
        </Link>
        <Link to="/settings" className="text-sm font-semibold text-primary">
          Settings
        </Link>
      </div>
      <form onSubmit={onSubmit} className="card-shadow space-y-3 rounded-3xl bg-surface p-5">
        <label className="block text-sm font-medium">
          Full name
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inCls} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Mobile
            <input value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} className={inCls} />
          </label>
          <label className="block text-sm font-medium">
            Farmer ID
            <input value={form.farmer_id} onChange={(e) => setForm({ ...form, farmer_id: e.target.value })} className={inCls} />
          </label>
        </div>
        <label className="block text-sm font-medium">
          State
          <select
            value={form.state}
            onChange={(e) => {
              const state = e.target.value;
              const district = Object.keys(locationData[state] ?? {})[0] ?? "";
              const taluka = locationData[state]?.[district]?.[0] ?? "";
              setForm({ ...form, state, district, taluka });
            }}
            className={inCls}
          >
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            District
            <select
              value={form.district}
              onChange={(e) => {
                const district = e.target.value;
                const taluka = locationData[form.state]?.[district]?.[0] ?? "";
                setForm({ ...form, district, taluka });
              }}
              className={inCls}
            >
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Taluka
            <select value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} className={inCls}>
              {talukas.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Village
          <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className={inCls} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            PIN
            <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={inCls} />
          </label>
          <label className="block text-sm font-medium">
            Land (acres)
            <input value={form.land_area} onChange={(e) => setForm({ ...form, land_area: e.target.value })} className={inCls} />
          </label>
          <label className="block text-sm font-medium">
            Main crop
            <input value={form.main_crop} onChange={(e) => setForm({ ...form, main_crop: e.target.value })} className={inCls} />
          </label>
        </div>
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-surface">
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </Shell>
  );
}

const inCls = "mt-1 w-full rounded-2xl border-0 bg-chip px-3 py-2.5 ring-1 ring-border";
