import { createFileRoute } from "@tanstack/react-router";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/support")({ component: SupportPage });

function SupportPage() {
  return (
    <AuthWall>
      <Shell title="Support" backTo="/dashboard">
        <div className="card-shadow space-y-3 rounded-3xl bg-surface p-6">
          <p className="text-sm text-muted">
            AgroFam help desk for mandi rates, weather, schemes and equipment listings.
          </p>
          <p className="text-sm">
            Helpline: <span className="font-semibold">155261 / 011-23381092</span>
          </p>
          <p className="text-sm">
            PM-KISAN portal:{" "}
            <a className="font-semibold text-primary" href="https://pmkisan.gov.in" target="_blank" rel="noreferrer">
              pmkisan.gov.in
            </a>
          </p>
          <p className="text-sm">
            Agmarknet:{" "}
            <a className="font-semibold text-primary" href="https://agmarknet.gov.in" target="_blank" rel="noreferrer">
              agmarknet.gov.in
            </a>
          </p>
        </div>
      </Shell>
    </AuthWall>
  );
}
