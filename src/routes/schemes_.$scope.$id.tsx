import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import { getScheme, type Scheme } from "@/lib/fn/schemes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/schemes_/$scope/$id")({
  component: SchemeDetailsPage,
});

function SchemeDetailsPage() {
  return (
    <AuthWall>
      <SchemeDetails />
    </AuthWall>
  );
}

function SchemeDetails() {
  const { scope, id } = Route.useParams();
  const [scheme, setScheme] = useState<Scheme | null | undefined>(undefined);
  const [tab, setTab] = useState<"overview" | "eligibility" | "documents">("overview");

  useEffect(() => {
    let alive = true;
    void getScheme({ data: { scope, id: Number(id) } })
      .then((s) => {
        if (alive) setScheme(s);
      })
      .catch(() => {
        if (alive) setScheme(null);
      });
    return () => {
      alive = false;
    };
  }, [scope, id]);

  const isKisan = (scheme?.scheme_name ?? "").toLowerCase().includes("kisan samman");

  return (
    <Shell>
      <Link to="/schemes" className="text-sm text-muted">
        ← Back to Schemes
      </Link>
      {scheme === undefined ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : scheme === null ? (
        <p className="mt-4">Scheme not found.</p>
      ) : (
        <article className="mt-4 space-y-4">
          <section
            className={cn(
              "rounded-3xl px-6 py-6 text-white",
              isKisan ? "bg-scheme-hero" : "bg-primary",
            )}
          >
            <p className="text-xs uppercase tracking-wide text-white/80">
              {scheme._scope} · {scheme.category}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{scheme.scheme_name}</h1>
            <p className="mt-2 text-sm text-white/85">{scheme._scope_name}</p>
          </section>
          <div className="flex overflow-hidden rounded-2xl border border-border bg-surface text-sm font-semibold">
            {(["overview", "eligibility", "documents"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  "min-h-11 flex-1 capitalize",
                  tab === k ? "bg-primary text-white" : "text-muted",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          {tab === "overview" ? (
            <section className="card-shadow rounded-3xl bg-surface p-5 text-sm leading-relaxed">
              <p>{scheme.description}</p>
              <h2 className="mt-4 font-bold">Key Benefits</h2>
              <p className="mt-1">{scheme.benefits}</p>
              <div className="mt-4 rounded-2xl bg-chip p-4">
                <p className="font-semibold">How to apply</p>
                <p className="mt-1 text-muted">{scheme.application_mode}</p>
              </div>
            </section>
          ) : null}
          {tab === "eligibility" ? (
            <section className="card-shadow rounded-3xl bg-surface p-5 text-sm">
              <ul className="list-disc space-y-1 pl-5">
                {(scheme.eligibility ?? []).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {tab === "documents" ? (
            <section className="card-shadow rounded-3xl bg-surface p-5 text-sm">
              <ul className="list-disc space-y-1 pl-5">
                {(scheme.documents ?? []).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {scheme.official_website ? (
            <a
              href={scheme.official_website}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white"
            >
              Apply Now →
            </a>
          ) : null}
        </article>
      )}
    </Shell>
  );
}
