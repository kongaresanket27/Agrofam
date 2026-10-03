import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Landmark, Shield, Sprout, CreditCard, Store } from "lucide-react";
import { AuthWall } from "@/components/auth-wall";
import { Shell, fieldCls } from "@/components/shell";
import { UsageTracker } from "@/components/usage-tracker";
import { listSchemes, type SchemeCard } from "@/lib/fn/schemes";
import { getProfile } from "@/lib/fn/profile";
import { t, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/schemes")({ component: SchemesPage });

const ICONS = [Landmark, Shield, Sprout, CreditCard, Store];

function SchemesPage() {
  return (
    <AuthWall>
      <UsageTracker feature="schemes" />
      <Schemes />
    </AuthWall>
  );
}

function Schemes() {
  const { lang } = useI18n();
  const [state, setState] = useState("Maharashtra");
  const [q, setQ] = useState("");
  const [central, setCentral] = useState<SchemeCard[]>([]);
  const [stateSchemes, setStateSchemes] = useState<SchemeCard[]>([]);
  const [states, setStates] = useState<string[]>(["Maharashtra"]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void getProfile()
      .then((p) => {
        if (p.state) setState(p.state);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    void listSchemes({ data: { state, q } })
      .then((res) => {
        if (!alive) return;
        setCentral(res.central);
        setStateSchemes(res.state);
        setStates(res.states);
        setBusy(false);
      })
      .catch(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [state, q]);

  const items = [...central, ...stateSchemes];

  return (
    <Shell title={t(lang, "schemes")} subtitle={t(lang, "schemesSub")} backTo="/dashboard">
      <div className="card-shadow flex flex-col gap-3 rounded-3xl bg-surface p-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search schemes…"
          className={`${fieldCls} mt-0 flex-1`}
        />
        <select value={state} onChange={(e) => setState(e.target.value)} className={`${fieldCls} mt-0 sm:w-56`}>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {busy ? <p className="mt-4 text-sm text-muted">Loading…</p> : null}
      <ul className="mt-4 space-y-3">
        {items.map((s, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={`${s._scope}-${s.id}`}>
              <div className="card-shadow flex items-center gap-3 rounded-3xl bg-surface px-4 py-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-chip text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.scheme_name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={
                        s._scope === "central"
                          ? "rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-800"
                          : "rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800"
                      }
                    >
                      {s._scope}
                    </span>
                    <span className="text-muted">{s.category}</span>
                    {s.benefits ? (
                      <span className="truncate text-muted">
                        {s.benefits.replace(/\s+/g, " ").slice(0, 42)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Link
                  to="/schemes/$scope/$id"
                  params={{ scope: s._scope, id: String(s.id) }}
                  className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold leading-10 text-white"
                >
                  {t(lang, "view")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
