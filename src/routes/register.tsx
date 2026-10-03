import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { saveProfile } from "@/lib/fn/profile";
import { districtsOf, locationData, stateNames, talukasOf } from "@/data/location-data";
import { isStrongPassword } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: Register });

function Register() {
  const navigate = useNavigate();
  const states = stateNames();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
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

  const districts = districtsOf(form.state);
  const talukas = talukasOf(form.state, form.district);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.mobile_number)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!isStrongPassword(form.password)) {
      toast.error(
        "Password needs 8+ characters, one uppercase, one lowercase and one number.",
      );
      return;
    }
    setBusy(true);
    try {
      const created = await authClient.signUp.email({
        email: form.email,
        password: form.password,
        name: form.full_name,
      });
      if (created.error) {
        toast.error(created.error.message ?? "Could not register");
        return;
      }
      try {
        await saveProfile({
          data: {
            full_name: form.full_name,
            mobile_number: form.mobile_number,
            farmer_id: form.farmer_id || undefined,
            village: form.village,
            state: form.state,
            district: form.district,
            taluka: form.taluka,
            pincode: form.pincode || undefined,
            land_area: form.land_area || undefined,
            main_crop: form.main_crop || undefined,
            gender: form.gender || undefined,
          },
        });
      } catch {
        /* profile can be completed after sign-in */
      }
      toast.success("Account created");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-band min-h-dvh px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="card-shadow mx-auto w-full max-w-lg space-y-4 rounded-3xl bg-surface p-6"
      >
        <h1 className="font-display text-3xl">Create farmer account</h1>
        <p className="text-sm text-muted">
          Email is used to sign in. Farm details personalise mandi, weather and
          schemes. Aadhaar is never stored.
        </p>

        <Field label="Full name">
          <input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={inCls} />
        </Field>
        <Field label="Email">
          <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inCls} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Password">
            <input type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} className={inCls} />
          </Field>
          <Field label="Confirm password">
            <input type="password" required value={form.confirm} onChange={(e) => set("confirm", e.target.value)} className={inCls} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mobile">
            <input required inputMode="numeric" value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value)} className={inCls} />
          </Field>
          <Field label="Farmer ID (optional)">
            <input value={form.farmer_id} onChange={(e) => set("farmer_id", e.target.value)} className={inCls} />
          </Field>
        </div>
        <Field label="State">
          <select
            value={form.state}
            onChange={(e) => {
              const state = e.target.value;
              const district = Object.keys(locationData[state] ?? {})[0] ?? "";
              const taluka = locationData[state]?.[district]?.[0] ?? "";
              setForm((p) => ({ ...p, state, district, taluka }));
            }}
            className={inCls}
          >
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="District">
            <select
              value={form.district}
              onChange={(e) => {
                const district = e.target.value;
                const taluka = locationData[form.state]?.[district]?.[0] ?? "";
                setForm((p) => ({ ...p, district, taluka }));
              }}
              className={inCls}
            >
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Taluka">
            <select value={form.taluka} onChange={(e) => set("taluka", e.target.value)} className={inCls}>
              {talukas.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Village">
          <input value={form.village} onChange={(e) => set("village", e.target.value)} className={inCls} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="PIN">
            <input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} className={inCls} />
          </Field>
          <Field label="Land (acres)">
            <input value={form.land_area} onChange={(e) => set("land_area", e.target.value)} className={inCls} />
          </Field>
          <Field label="Main crop">
            <input value={form.main_crop} onChange={(e) => set("main_crop", e.target.value)} className={inCls} />
          </Field>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-surface disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
        <p className="text-center text-sm text-muted">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

const inCls = "mt-1 w-full rounded-2xl border-0 bg-chip px-3 py-2.5 ring-1 ring-border";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
