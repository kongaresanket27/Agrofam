import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, Sun, Tractor, University, Wrench } from "lucide-react";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import { UsageTracker } from "@/components/usage-tracker";
import { getProfile, type FarmerProfile } from "@/lib/fn/profile";
import { getWeather, type WeatherNow } from "@/lib/fn/weather";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { coerceAdminFlag, isAdminEmail } from "@/lib/admin-account";
import { t, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): { as?: "farmer" } =>
    search.as === "farmer" ? { as: "farmer" } : {},
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AuthWall>
      <UsageTracker feature="home" />
      <Dashboard />
    </AuthWall>
  );
}

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 17) return "goodAfternoon";
  return "goodEvening";
}

function Dashboard() {
  const user = useCurrentUser();
  const { lang } = useI18n();
  const { as } = Route.useSearch();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);

  useEffect(() => {
    let alive = true;
    void getProfile()
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        if ((coerceAdminFlag(p.is_admin) || isAdminEmail(user?.primaryEmail)) && as !== "farmer") return;
        const state = p.state || "Maharashtra";
        const district = p.district || "Pune";
        return getWeather({ data: { state, district, forecast: false } });
      })
      .then((w) => {
        if (alive && w) setWeather(w);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [as]);

  if ((coerceAdminFlag(profile?.is_admin) || isAdminEmail(user?.primaryEmail)) && as !== "farmer") {
    return <Navigate to="/admin" />;
  }

  const name = profile?.full_name || user?.displayName || "Farmer";
  const place = [profile?.district, profile?.state].filter(Boolean).join(", ") || "Pune, Maharashtra";
  const temp = weather?.success ? Math.round(weather.temperature ?? 0) : null;
  const desc = weather?.description
    ? weather.description.replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  return (
    <Shell>
      <section className="rounded-3xl bg-linear-to-r from-primary-dark to-primary px-6 py-7 text-white">
        <p className="text-sm text-white/80">{t(lang, greetingKey())}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t(lang, "welcomeFarmer", { name })}
        </h1>
        <p className="mt-2 text-sm text-white/85">
          {place}
          {temp != null ? ` · Today: ${desc} · ${temp}°C` : ""}
        </p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <DashCard
          to="/market"
          icon={ShoppingCart}
          tone="bg-market/15 text-market"
          title={t(lang, "marketRate")}
          body={t(lang, "marketSub")}
          cta={t(lang, "open")}
        />
        <DashCard
          to="/schemes"
          icon={University}
          tone="bg-subsidy/20 text-subsidy"
          title={t(lang, "subsidy")}
          body={t(lang, "subsidySub")}
          cta={t(lang, "open")}
        />
        <DashCard
          to="/equipment"
          icon={Wrench}
          tone="bg-equip/15 text-equip"
          title={t(lang, "equipment")}
          body={t(lang, "equipmentSub")}
          cta={t(lang, "open")}
        />
      </div>

      <Link
        to="/weather"
        className="card-shadow mt-6 flex items-center gap-4 rounded-3xl bg-surface px-5 py-4"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-600">
          <Sun className="size-6" />
        </span>
        <div className="flex-1">
          <p className="text-xs text-muted">
            {t(lang, "todayWeather")} · {weather?.location || place}
          </p>
          <p className="font-semibold">
            {desc || "—"}
            {temp != null ? ` · ${temp}°C` : ""}
            {weather?.humidity != null ? ` · Humidity ${weather.humidity}%` : ""}
            {weather?.wind_speed != null
              ? ` · Wind ${Math.round(weather.wind_speed * 3.6)} km/h`
              : ""}
          </p>
        </div>
        <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
          {t(lang, "details")}
        </span>
      </Link>
    </Shell>
  );
}

function DashCard({
  to,
  icon: Icon,
  tone,
  title,
  body,
  cta,
}: {
  to: "/market" | "/schemes" | "/equipment";
  icon: typeof Tractor;
  tone: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="card-shadow flex flex-col items-center rounded-3xl bg-surface px-5 py-8 text-center"
    >
      <span className={`grid size-14 place-items-center rounded-2xl ${tone}`}>
        <Icon className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
      <span className="mt-4 text-sm font-semibold text-primary">{cta} ›</span>
    </Link>
  );
}
