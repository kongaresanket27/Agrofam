import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import { getProfile, saveProfile } from "@/lib/fn/profile";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <AuthWall>
      <Settings />
    </AuthWall>
  );
}

function Settings() {
  const [weather, setWeather] = useState(true);
  const [market, setMarket] = useState(true);
  const [schemes, setSchemes] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    void getProfile().then((p) => {
      setWeather(p.notify_weather);
      setMarket(p.notify_market);
      setSchemes(p.notify_schemes);
      setName(p.full_name);
    });
  }, []);

  async function save() {
    try {
      await saveProfile({
        data: {
          full_name: name || "Farmer",
          notify_weather: weather,
          notify_market: market,
          notify_schemes: schemes,
        },
      });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Shell title="Settings">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">Alert preferences for this account.</p>
        <Toggle label="Weather alerts" checked={weather} onChange={setWeather} />
        <Toggle label="Mandi price alerts" checked={market} onChange={setMarket} />
        <Toggle label="Scheme updates" checked={schemes} onChange={setSchemes} />
        <button
          type="button"
          onClick={() => void save()}
          className="mt-2 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-surface"
        >
          Save
        </button>
      </div>
    </Shell>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-primary"
      />
    </label>
  );
}
