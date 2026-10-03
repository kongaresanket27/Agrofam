import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { coerceAdminFlag, isAdminEmail } from "@/lib/admin-account";

export const FEATURES = ["home", "weather", "market", "schemes", "equipment"] as const;
export type FeatureKey = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  home: "Home",
  weather: "Weather",
  market: "Market",
  schemes: "Schemes",
  equipment: "Equipment",
};

export type UsageRow = {
  feature: string;
  count: number;
  last_used_at: string;
};

async function requireAdmin(userId: string) {
  const sql = await getSql();
  const me = await sql<{ is_admin: boolean }>`
    select is_admin from farmer_profiles where user_id = ${userId}
  `;
  if (coerceAdminFlag(me[0]?.is_admin)) return;
  const users = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
  if (!isAdminEmail(users[0]?.email)) throw new Error("Admin only");
}

export const recordUsage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ feature: z.enum(FEATURES) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into feature_usage (user_id, feature, count, last_used_at)
      values (${context.userId}, ${data.feature}, 1, now())
      on conflict (user_id, feature) do update set
        count = feature_usage.count + 1,
        last_used_at = now()
    `;
    return { ok: true as const };
  });

export const listUsageTotals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql.query<UsageRow>(
      `select feature, sum(count)::int as count, max(last_used_at)::text as last_used_at
       from feature_usage group by feature order by feature`,
    );
    return rows;
  });
