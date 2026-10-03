import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AuthWall } from "@/components/auth-wall";
import { Shell, fieldCls } from "@/components/shell";
import { UsageTracker } from "@/components/usage-tracker";
import { districtsOf, locationData, stateNames, talukasOf } from "@/data/location-data";
import { getWeather, type WeatherNow } from "@/lib/fn/weather";
import { getProfile } from "@/lib/fn/profile";
import { t, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/weather")({ component: WeatherPage });

function WeatherPage() {
  return (
    <AuthWall>
      <UsageTracker feature="weather" />
      <Weather />
    </AuthWall>
  );
}

function applyPlace(
  w: WeatherNow,
  setState: (s: string) => void,
  setDistrict: (s: string) => void,
  setTaluka: (s: string) => void,
) {
  if (!w.place) return;
  setState(w.place.state);
  setDistrict(w.place.district);
  setTaluka(w.place.taluka);
}

function Weather() {
  const { lang } = useI18n();
  const states = stateNames();
  const [state, setState] = useState("Maharashtra");
  const [district, setDistrict] = useState("Pune");
  const [taluka, setTaluka] = useState("Haveli");
  const [data, setData] = useState<WeatherNow | null>(null);
  const [busy, setBusy] = useState(false);
  const [locLabel, setLocLabel] = useState("Using saved farm location");

  const districts = useMemo(() => districtsOf(state), [state]);
  const talukas = talukasOf(state, district);

  async function load(next: {
    state?: string;
    district?: string;
    taluka?: string;
    lat?: number;
    lon?: number;
  }) {
    setBusy(true);
    try {
      const w = await getWeather({ data: { ...next, forecast: true } });
      setData(w);
      if (w.success && w.place) applyPlace(w, setState, setDistrict, setTaluka);
      return w;
    } catch {
      setData({ success: false, message: "Could not load weather. Try again." });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function useGps(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) toast.error("Location is not available on this device");
      return false;
    }
    setBusy(true);
    setLocLabel("Finding your location…");
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void load({ lat: pos.coords.latitude, lon: pos.coords.longitude }).then((w) => {
            if (w?.success) {
              setLocLabel(`Near ${w.location || "you"}`);
              toast.success(`Weather for ${w.location || "your location"}`);
              resolve(true);
            } else {
              setLocLabel("Could not read GPS weather");
              resolve(false);
            }
          });
        },
        () => {
          setBusy(false);
          setLocLabel("Location permission needed");
          if (!silent) toast.error("Allow location to auto-select weather");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
      );
    });
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ok = await useGps(true);
      if (!alive || ok) return;
      try {
        const p = await getProfile();
        if (!alive) return;
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
        setLocLabel("Using saved farm location");
        await load({ state: s, district: d, taluka: tk });
      } catch {
        if (alive) await load({ state: "Maharashtra", district: "Pune", taluka: "Haveli" });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rain = data?.rainChance ?? 0;
  const pie = [
    { name: "rain", value: Math.max(rain, 0.1) },
    { name: "rest", value: Math.max(0.1, 100 - rain) },
  ];
  const hourly = (data?.hourly ?? []).map((h) => ({
    hour: h.hour,
    temp: Number(h.temp),
  }));
  const days = (data?.forecast ?? []).map((f) => ({
    day: f.day || new Date(f.dt * 1000).toLocaleDateString("en-IN", { weekday: "short" }),
    max: Math.round(f.temp_max),
    min: Math.round(f.temp_min),
  }));
  const temps = hourly.map((h) => h.temp);
  const yMin = temps.length ? Math.floor(Math.min(...temps) - 2) : 0;
  const yMax = temps.length ? Math.ceil(Math.max(...temps) + 2) : 40;

  return (
    <Shell title={t(lang, "weatherDash")} subtitle={t(lang, "weatherSub")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{locLabel}</p>
        <button
          type="button"
          onClick={() => void useGps(false)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white"
        >
          <LocateFixed className="size-4" />
          Use my location
        </button>
      </div>
      <div className="card-shadow grid gap-3 rounded-3xl bg-surface p-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">
          {t(lang, "state")}
          <select
            className={fieldCls}
            value={state}
            onChange={(e) => {
              const next = e.target.value;
              const d = Object.keys(locationData[next] ?? {})[0] ?? "";
              const tk = locationData[next]?.[d]?.[0] ?? "";
              setState(next);
              setDistrict(d);
              setTaluka(tk);
              setLocLabel("Manual place");
              void load({ state: next, district: d, taluka: tk });
            }}
          >
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {t(lang, "district")}
          <select
            className={fieldCls}
            value={district}
            onChange={(e) => {
              const d = e.target.value;
              const tk = locationData[state]?.[d]?.[0] ?? "";
              setDistrict(d);
              setTaluka(tk);
              setLocLabel("Manual place");
              void load({ state, district: d, taluka: tk });
            }}
          >
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {t(lang, "taluka")}
          <select
            className={fieldCls}
            value={taluka}
            onChange={(e) => {
              setTaluka(e.target.value);
              setLocLabel("Manual place");
              void load({ state, district, taluka: e.target.value });
            }}
          >
            {talukas.map((tk) => (
              <option key={tk}>{tk}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={() => void load({ state, district, taluka })}
        className="mt-3 text-sm font-semibold text-primary"
      >
        {busy ? "Fetching…" : "Refresh forecast"}
      </button>

      {data && !data.success ? <p className="mt-4 text-sm text-accent">{data.message}</p> : null}

      {data?.success ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="card-shadow rounded-3xl bg-surface p-5">
            <p className="font-semibold">Now · {data.location}</p>
            <p className="mt-2 text-4xl font-bold tabular-nums">{Math.round(data.temperature ?? 0)}°C</p>
            <p className="text-sm capitalize text-muted">{data.description}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Wind Speed</dt>
                <dd className="tabular-nums">{Math.round((data.wind_speed ?? 0) * 3.6)} km/h</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Humidity</dt>
                <dd className="tabular-nums">{data.humidity}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Rain Chance</dt>
                <dd className="tabular-nums">{rain}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Feels Like</dt>
                <dd className="tabular-nums">{Math.round(data.feels_like ?? 0)}°C</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-2xl bg-chip px-3 py-2 text-sm text-primary">{data.advice?.[0]}</p>
          </div>
          <div className="card-shadow rounded-3xl bg-surface p-5">
            <p className="font-semibold">Temperature today</p>
            {hourly.length ? (
              <div className="mt-2 h-48 w-full">
                <ResponsiveContainer width="100%" height={192}>
                  <AreaChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4eee6" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#5b6b5e" }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={[yMin, yMax]}
                      width={32}
                      tick={{ fontSize: 11, fill: "#5b6b5e" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(v) => [`${v}°C`, "Temp"]} />
                    <Area type="monotone" dataKey="temp" stroke="#e8a317" fill="#fde9c4" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 text-sm text-muted">Hourly curve not available.</p>
            )}
          </div>
          <div className="card-shadow flex flex-col items-center rounded-3xl bg-surface p-5">
            <p className="self-start font-semibold">Rain chance</p>
            <div className="relative mt-2 h-44 w-44">
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={72}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#1b7a4a" />
                    <Cell fill="#dcefe3" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <p className="text-2xl font-bold tabular-nums">{rain}%</p>
              </div>
            </div>
            <p className="text-xs text-muted">Chance of rain</p>
          </div>
          <div className="card-shadow rounded-3xl bg-surface p-5">
            <p className="font-semibold">5-day forecast</p>
            {days.length ? (
              <div className="mt-2 h-48 w-full">
                <ResponsiveContainer width="100%" height={192}>
                  <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4eee6" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5b6b5e" }} tickLine={false} axisLine={false} />
                    <YAxis width={28} tick={{ fontSize: 11, fill: "#5b6b5e" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v}°C`, "Max"]} />
                    <Bar dataKey="max" fill="#1b7a4a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 text-sm text-muted">Forecast not available.</p>
            )}
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {days.map((d) => (
                <li key={d.day} className="flex justify-between">
                  <span>{d.day}</span>
                  <span className="tabular-nums">
                    {d.max}° / {d.min}°
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-shadow rounded-3xl bg-surface p-5">
            <p className="font-semibold">Temp. trend (°C)</p>
            {hourly.length ? (
              <div className="mt-2 h-48 w-full">
                <ResponsiveContainer width="100%" height={192}>
                  <AreaChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4eee6" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#5b6b5e" }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={[yMin, yMax]}
                      width={32}
                      tick={{ fontSize: 11, fill: "#5b6b5e" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(v) => [`${v}°C`, "Temp"]} />
                    <Area type="monotone" dataKey="temp" stroke="#1b7a4a" fill="#cfead9" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-8 text-sm text-muted">Trend not available.</p>
            )}
          </div>
          <div className="card-shadow rounded-3xl bg-surface p-5 text-sm">
            <p className="font-semibold">Weather parameters</p>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted">Moisture</dt>
                <dd>
                  {data.humidity}%{" "}
                  <span className="text-ok">{(data.humidity ?? 0) > 60 ? "High" : "Normal"}</span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Visibility</dt>
                <dd>{data.visibility?.toFixed(0)} km</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Pressure</dt>
                <dd>{data.pressure} hPa</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Clouds</dt>
                <dd>{data.clouds}%</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
