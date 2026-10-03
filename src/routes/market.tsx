import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthWall } from "@/components/auth-wall";
import { Shell, btnCls, fieldCls } from "@/components/shell";
import { UsageTracker } from "@/components/usage-tracker";
import { districtsOf, locationData, stateNames, talukasOf } from "@/data/location-data";
import { getCropPrices, type MandiRow } from "@/lib/fn/prices";
import { getProfile } from "@/lib/fn/profile";
import { t, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/market")({ component: MarketPage });

function MarketPage() {
  return (
    <AuthWall>
      <UsageTracker feature="market" />
      <Market />
    </AuthWall>
  );
}

function tagFor(row: MandiRow, i: number) {
  const n = Number(row.modal_price);
  if (!Number.isFinite(n)) return { label: "Stable", cls: "bg-sky-100 text-sky-800" };
  if (i === 0) return { label: "New", cls: "bg-emerald-100 text-emerald-800" };
  if (n >= 5000) return { label: "High", cls: "bg-amber-100 text-amber-800" };
  if (n <= 2000) return { label: "Low", cls: "bg-rose-100 text-rose-800" };
  return { label: "Stable", cls: "bg-sky-100 text-sky-800" };
}

function trendFrom(price: number) {
  const base = price || 2400;
  return [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const wobble = Math.sin(d * 1.2 + base / 80) * (base * 0.04);
    return {
      day: ["20", "21", "22", "23", "24", "25", "26"][d],
      price: Math.round(base * 0.92 + wobble + d * (base * 0.012)),
    };
  });
}

function Market() {
  const { lang } = useI18n();
  const states = stateNames();
  const [step, setStep] = useState<"pick" | "list" | "detail">("pick");
  const [state, setState] = useState("Maharashtra");
  const [district, setDistrict] = useState("Pune");
  const [taluka, setTaluka] = useState("Haveli");
  const [rows, setRows] = useState<MandiRow[]>([]);
  const [source, setSource] = useState<"live" | "sample" | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<MandiRow | null>(null);

  const districts = useMemo(() => districtsOf(state), [state]);
  const talukas = talukasOf(state, district);

  useEffect(() => {
    void getProfile().then((p) => {
      const s = p.state && locationData[p.state] ? p.state : "Maharashtra";
      const d =
        p.district && locationData[s]?.[p.district]
          ? p.district
          : Object.keys(locationData[s] ?? {})[0] ?? "Pune";
      const tk =
        p.taluka && locationData[s]?.[d]?.includes(p.taluka)
          ? p.taluka
          : locationData[s]?.[d]?.[0] ?? "";
      setState(s);
      setDistrict(d);
      setTaluka(tk);
    });
  }, []);

  async function load() {
    setBusy(true);
    try {
      const res = await getCropPrices({ data: { state, district } });
      setRows(res.data);
      setSource(res.source);
      setStep("list");
    } catch {
      setRows([]);
      setSource("sample");
      setStep("list");
    } finally {
      setBusy(false);
    }
  }

  if (step === "pick") {
    return (
      <Shell backTo="/dashboard">
        <div className="mx-auto max-w-md">
          <div className="card-shadow rounded-3xl bg-surface p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-market/15 text-market">
                <ShoppingCart className="size-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold">{t(lang, "marketRate")}</h1>
                <p className="text-sm text-muted">{t(lang, "selectLocation")}</p>
              </div>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
              Select location
            </p>
            <label className="mt-3 block text-sm font-semibold">
              {t(lang, "state")}
              <select
                className={fieldCls}
                value={state}
                onChange={(e) => {
                  const next = e.target.value;
                  const d = Object.keys(locationData[next] ?? {})[0] ?? "";
                  setState(next);
                  setDistrict(d);
                  setTaluka(locationData[next]?.[d]?.[0] ?? "");
                }}
              >
                {states.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              {t(lang, "district")}
              <select className={fieldCls} value={district} onChange={(e) => {
                setDistrict(e.target.value);
                setTaluka(locationData[state]?.[e.target.value]?.[0] ?? "");
              }}>
                {districts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              {t(lang, "taluka")}
              <select className={fieldCls} value={taluka} onChange={(e) => setTaluka(e.target.value)}>
                {talukas.map((tk) => (
                  <option key={tk}>{tk}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy} className={`${btnCls} mt-6`} onClick={() => void load()}>
              {busy ? "…" : `${t(lang, "viewPrices")} →`}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (step === "detail" && selected) {
    const price = Number(selected.modal_price) || 0;
    const chart = trendFrom(price);
    return (
      <Shell>
        <button type="button" className="mb-3 text-sm text-muted" onClick={() => setStep("list")}>
          ← Back to Market List
        </button>
        <section className="rounded-3xl bg-primary px-6 py-6 text-white">
          <p className="text-sm text-white/80">
            {selected.variety || "Crop"} · {selected.market}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{selected.commodity}</h1>
          <p className="mt-4 text-sm text-white/80">Today's Price</p>
          <p className="text-4xl font-bold tabular-nums">₹{Number(selected.modal_price).toLocaleString("en-IN")}</p>
          <p className="text-sm text-white/80">per quintal</p>
        </section>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="card-shadow rounded-3xl bg-surface p-4">
            <p className="text-sm font-semibold">7-Day Price Trend</p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height={192}>
                <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4eee6" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    width={40}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[
                      (min: number) => Math.floor(min - 40),
                      (max: number) => Math.ceil(max + 40),
                    ]}
                  />
                  <Tooltip formatter={(v) => [`₹${v}`, "Price"]} />
                  <Area type="monotone" dataKey="price" stroke="#1b7a4a" fill="#cfead9" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted">Indicative curve from latest modal price.</p>
          </div>
          <div className="card-shadow rounded-3xl bg-surface p-4 text-sm">
            <p className="font-semibold">Crop Details</p>
            <dl className="mt-3 space-y-2">
              <Row k="Variety" v={selected.variety || "—"} />
              <Row k="Market" v={selected.market} />
              <Row k="Min" v={`₹${selected.min_price}`} />
              <Row k="Max" v={`₹${selected.max_price}`} />
              <Row k="Arrival" v={selected.arrival_date} />
            </dl>
          </div>
        </div>
        <div className="card-shadow mt-4 rounded-3xl bg-surface p-4">
          <p className="font-semibold">Nearby mandis in this feed</p>
          <ul className="mt-3 space-y-2 text-sm">
            {rows.slice(0, 6).map((r, i) => (
              <li key={`${r.market}-${i}`} className="flex justify-between rounded-xl bg-chip px-3 py-2">
                <span>{r.market}</span>
                <span className="tabular-nums font-semibold">₹{r.modal_price}</span>
              </li>
            ))}
          </ul>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <button type="button" className="mb-3 text-sm text-muted" onClick={() => setStep("pick")}>
        ← {t(lang, "back")}
      </button>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t(lang, "marketPrices")}</h1>
          <p className="text-sm text-muted">
            {state} · Today's mandi rates
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          ● {t(lang, "live")}
        </span>
      </div>
      {source === "sample" ? (
        <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Live feed was empty — showing reference rates.
        </p>
      ) : (
        <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Displays market name and price. Tap View for full details.
        </p>
      )}
      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-muted">No mandi rates for this location yet.</li>
        ) : null}
        {rows.map((row, i) => {
          const tag = tagFor(row, i);
          return (
            <li key={`${row.market}-${row.commodity}-${i}`} className="card-shadow flex items-center gap-3 rounded-3xl bg-surface px-4 py-4">
              <div className="flex-1">
                <p className="font-bold">
                  {row.commodity}{" "}
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tag.cls}`}>
                    {tag.label}
                  </span>
                </p>
                <p className="text-sm text-muted">
                  {row.market}{" "}
                  <span className="font-semibold text-fg">₹{Number(row.modal_price).toLocaleString("en-IN")}</span>{" "}
                  per quintal
                </p>
              </div>
              <button
                type="button"
                className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white"
                onClick={() => {
                  setSelected(row);
                  setStep("detail");
                }}
              >
                {t(lang, "view")}
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
