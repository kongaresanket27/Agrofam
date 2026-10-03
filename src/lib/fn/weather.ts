import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { matchPlace } from "@/data/location-data";
import {
  getOpenWeatherKey,
  OPENWEATHER_BASE,
  OPENWEATHER_FORECAST,
  OPENWEATHER_GEO,
} from "@/lib/secrets.server";

function cleanName(name?: string | null) {
  if (!name) return "";
  return String(name).replace(/\(.*?\)/g, "").trim();
}

export type WeatherNow = {
  success: boolean;
  message?: string;
  location?: string;
  place?: { state: string; district: string; taluka: string };
  temperature?: number;
  feels_like?: number;
  temp_min?: number;
  temp_max?: number;
  humidity?: number;
  pressure?: number;
  visibility?: number;
  wind_speed?: number;
  weather?: string;
  description?: string;
  icon?: string;
  clouds?: number;
  rainChance?: number;
  hourly?: Array<{ hour: string; temp: number }>;
  forecast?: Array<{
    dt: number;
    temp: number;
    temp_min: number;
    temp_max: number;
    description: string;
    icon: string;
    pop: number;
    day?: string;
  }>;
  advice?: string[];
};

const cache = new Map<string, { at: number; data: WeatherNow }>();
const TTL_MS = 5 * 60 * 1000;

function adviceFrom(description: string, humidity: number, wind: number): string[] {
  const d = description.toLowerCase();
  const tips: string[] = [];
  if (d.includes("rain") || d.includes("thunder")) {
    tips.push("Hold off spraying pesticides — rain will wash them off.");
    tips.push("Protect harvested grain from moisture and check drainage in low fields.");
  } else if (d.includes("clear") || d.includes("sun")) {
    tips.push("Good day for drying grain and field operations.");
    tips.push("Irrigate in the early morning to cut evaporation loss.");
  } else if (d.includes("cloud")) {
    tips.push("Mild conditions — suitable for transplanting and weeding.");
  }
  if (humidity > 80) tips.push("High humidity: watch for fungal disease on leaves.");
  if (wind > 8) tips.push("Strong wind: postpone foliar spray and secure polyhouses.");
  if (tips.length === 0) tips.push("Typical conditions — follow your usual crop calendar.");
  return tips;
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, status: res.status, body: null };
    return { ok: true, status: res.status, body: await res.json() };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

export const getWeather = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        state: z.string().optional(),
        district: z.string().optional(),
        taluka: z.string().optional(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        forecast: z.boolean().optional(),
      })
      .refine((d) => (d.lat != null && d.lon != null) || Boolean(d.district), {
        message: "Need a district or GPS coordinates",
      }),
  )
  .handler(async ({ data }): Promise<WeatherNow> => {
    const key = getOpenWeatherKey();
    const wantForecast = data.forecast !== false;
    const hasGps = data.lat != null && data.lon != null;
    const cacheKey = hasGps
      ? `gps|${data.lat!.toFixed(3)}|${data.lon!.toFixed(3)}|${wantForecast ? "f" : "n"}`
      : `${cleanName(data.state)}|${cleanName(data.district)}|${wantForecast ? "f" : "n"}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

    let currentUrl: string;
    let forecastUrl: string;
    if (hasGps) {
      const q = `lat=${data.lat}&lon=${data.lon}&appid=${encodeURIComponent(key)}&units=metric`;
      currentUrl = `${OPENWEATHER_BASE}?${q}`;
      forecastUrl = `${OPENWEATHER_FORECAST}?${q}`;
    } else {
      const district = cleanName(data.district);
      const state = cleanName(data.state) || "Maharashtra";
      const q = encodeURIComponent(`${district}, ${state}, India`);
      currentUrl = `${OPENWEATHER_BASE}?q=${q}&appid=${encodeURIComponent(key)}&units=metric`;
      forecastUrl = `${OPENWEATHER_FORECAST}?q=${q}&appid=${encodeURIComponent(key)}&units=metric`;
    }

    const [current, forecastRaw, geo] = await Promise.all([
      fetchJson(currentUrl),
      wantForecast ? fetchJson(forecastUrl) : Promise.resolve({ ok: false, status: 0, body: null }),
      hasGps
        ? fetchJson(
            `${OPENWEATHER_GEO}?lat=${data.lat}&lon=${data.lon}&limit=1&appid=${encodeURIComponent(key)}`,
          )
        : Promise.resolve({ ok: false, status: 0, body: null }),
    ]);

    let body = current.body as Record<string, unknown> | null;
    if (!body && !hasGps) {
      const district = cleanName(data.district);
      const fallback = await fetchJson(
        `${OPENWEATHER_BASE}?q=${encodeURIComponent(`${district}, India`)}&appid=${encodeURIComponent(key)}&units=metric`,
      );
      body = fallback.body as Record<string, unknown> | null;
    }
    if (!body) {
      return {
        success: false,
        message:
          current.status === 401
            ? "Weather service key was rejected. Try again later."
            : "Weather data not found for this location.",
      };
    }

    const main = body.main as Record<string, number>;
    const wind = (body.wind as Record<string, number>) ?? {};
    const weatherArr = (body.weather as Array<Record<string, string>>) ?? [];
    const clouds = (body.clouds as Record<string, number>) ?? {};
    const desc = weatherArr[0]?.description ?? "";
    const locName = String(body.name ?? data.district ?? "Your location");

    const geoRow = Array.isArray(geo.body) ? (geo.body[0] as Record<string, string> | undefined) : undefined;
    const place = matchPlace(
      geoRow?.state || data.state,
      geoRow?.name || locName || data.district,
    );

    let forecast: WeatherNow["forecast"] = [];
    let hourly: WeatherNow["hourly"] = [];
    let rainChance = 0;
    const fj = forecastRaw.body as
      | {
          list?: Array<{
            dt: number;
            main: { temp: number; temp_min?: number; temp_max?: number };
            weather: Array<{ description: string; icon: string }>;
            pop?: number;
          }>;
        }
      | null;
    if (fj?.list?.length) {
      hourly = fj.list.slice(0, 8).map((row) => ({
        hour: new Date(row.dt * 1000).toLocaleTimeString("en-IN", {
          hour: "numeric",
          hour12: true,
        }),
        temp: Math.round(row.main.temp * 10) / 10,
      }));
      rainChance = Math.round((fj.list[0]?.pop ?? 0) * 100);
      const byDay = new Map<string, NonNullable<WeatherNow["forecast"]>[number]>();
      for (const row of fj.list) {
        const dayKey = new Date(row.dt * 1000).toISOString().slice(0, 10);
        const prev = byDay.get(dayKey);
        const tmin = row.main.temp_min ?? row.main.temp;
        const tmax = row.main.temp_max ?? row.main.temp;
        const day = new Date(row.dt * 1000).toLocaleDateString("en-IN", { weekday: "short" });
        if (!prev) {
          byDay.set(dayKey, {
            dt: row.dt,
            temp: row.main.temp,
            temp_min: tmin,
            temp_max: tmax,
            description: row.weather[0]?.description ?? "",
            icon: row.weather[0]?.icon ?? "",
            pop: Math.round((row.pop ?? 0) * 100),
            day,
          });
        } else {
          prev.temp_min = Math.min(prev.temp_min, tmin);
          prev.temp_max = Math.max(prev.temp_max, tmax);
          prev.pop = Math.max(prev.pop, Math.round((row.pop ?? 0) * 100));
        }
      }
      forecast = [...byDay.values()].slice(0, 5);
    }

    if (!hourly.length && Number.isFinite(main.temp)) {
      const now = Math.round(main.temp * 10) / 10;
      hourly = [0, 3, 6, 9, 12, 15, 18, 21].map((h, i) => ({
        hour: `${((new Date().getHours() + h) % 24)}h`,
        temp: Math.round((now + Math.sin(i / 2) * 1.6) * 10) / 10,
      }));
    }

    const result: WeatherNow = {
      success: true,
      location: locName,
      place,
      temperature: main.temp,
      feels_like: main.feels_like,
      temp_min: main.temp_min,
      temp_max: main.temp_max,
      humidity: main.humidity,
      pressure: main.pressure,
      visibility: typeof body.visibility === "number" ? body.visibility / 1000 : 0,
      wind_speed: wind.speed,
      weather: weatherArr[0]?.main,
      description: desc,
      icon: weatherArr[0]?.icon,
      clouds: clouds.all,
      rainChance,
      hourly,
      forecast,
      advice: adviceFrom(desc, main.humidity ?? 0, wind.speed ?? 0),
    };
    cache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  });
