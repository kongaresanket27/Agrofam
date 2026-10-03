/**
 * External API credentials live only on the server.
 * Ciphertext is XOR+base64 (not a substitute for env on deploy).
 * Prefer process.env when the platform injects keys.
 */
import { Buffer } from "node:buffer";

const VAULT = "agrofam-vault-key-2026";

const CIPHER = {
  openWeather:
    "BwYQW1ADW08TBUdfQEkPBk0ZVgBQB1IBRFsFAA4ZEwU=",
  dataGov:
    "VFBLDVJXWUkUV0MJFx9YBx1JAgACBlFWQ1xTVl0ZFFQRDxEUX1UbHQVWVw9ZUEVXVVcMHUZYRA0=",
  resource:
    "UlJLV1NXWhVbURFbTQBfUxsZHwlXUldKRAlXUl4dTgBECEYZ",
} as const;

function unlock(cipher: string): string {
  const raw = Buffer.from(cipher, "base64");
  const key = Buffer.from(VAULT, "utf8");
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw[i] ^ key[i % key.length];
  }
  return out.toString("utf8");
}

function envOrUnlock(envName: string, cipher: string): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env[envName]?.trim() : undefined;
  if (fromEnv) return fromEnv;
  return unlock(cipher);
}

export function getOpenWeatherKey(): string {
  return envOrUnlock("OPENWEATHER_API_KEY", CIPHER.openWeather);
}

export function getDataGovKey(): string {
  return envOrUnlock("DATA_GOV_API_KEY", CIPHER.dataGov);
}

export function getDataGovResourceId(): string {
  return envOrUnlock("DATA_GOV_RESOURCE_ID", CIPHER.resource);
}

export const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5/weather";
export const OPENWEATHER_FORECAST =
  "https://api.openweathermap.org/data/2.5/forecast";
export const OPENWEATHER_GEO = "https://api.openweathermap.org/geo/1.0/reverse";
export const DATA_GOV_BASE = "https://api.data.gov.in";
