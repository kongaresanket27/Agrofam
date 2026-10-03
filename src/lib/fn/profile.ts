import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ADMIN_EMAIL, coerceAdminFlag, isAdminEmail } from "@/lib/admin-account";

export type FarmerProfile = {
  user_id: string;
  full_name: string;
  mobile_number: string | null;
  farmer_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  village: string | null;
  taluka: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  land_area: string | null;
  main_crop: string | null;
  is_admin: boolean;
  notify_weather: boolean;
  notify_market: boolean;
  notify_schemes: boolean;
};

async function seedWelcome(userId: string) {
  const sql = await getSql();
  const existing = await sql<{ c: number }>`
    select count(*)::int as c from notifications where user_id = ${userId}
  `;
  if ((existing[0]?.c ?? 0) > 0) return;
  await sql`
    insert into notifications (user_id, kind, title, message) values
    (${userId}, 'scheme', 'Welcome to AgroFam', 'Your farm desk is ready. Complete your profile for local mandi rates, weather and schemes.'),
    (${userId}, 'weather', 'Weather alerts on', 'We will flag heavy rain and heat stress for your district.'),
    (${userId}, 'market', 'Mandi watch', 'Check today''s crop prices before you sell.')
  `;
}

async function ensureAdminFlag(userId: string, profile: FarmerProfile): Promise<FarmerProfile> {
  profile.is_admin = coerceAdminFlag(profile.is_admin);
  const sql = await getSql();
  const users = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
  const email = users[0]?.email?.toLowerCase();
  if (isAdminEmail(email) && !profile.is_admin) {
    await sql`update farmer_profiles set is_admin = true where user_id = ${userId}`;
    profile.is_admin = true;
  }
  return profile;
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FarmerProfile> => {
    const sql = await getSql();
    const rows = await sql<FarmerProfile>`
      select user_id, full_name, mobile_number, farmer_id, date_of_birth, gender,
             village, taluka, district, state, pincode, land_area, main_crop,
             is_admin, notify_weather, notify_market, notify_schemes
      from farmer_profiles where user_id = ${context.userId}
    `;
    if (rows[0]) {
      if (!rows[0].is_admin) {
        const admins = await sql<{ c: number }>`
          select count(*)::int as c from farmer_profiles where is_admin = true
        `;
        if ((admins[0]?.c ?? 0) === 0) {
          await sql`
            update farmer_profiles set is_admin = true where user_id = ${context.userId}
          `;
          rows[0].is_admin = true;
        }
      }
      await seedWelcome(context.userId);
      return ensureAdminFlag(context.userId, rows[0]);
    }

    const admins = await sql<{ c: number }>`
      select count(*)::int as c from farmer_profiles where is_admin = true
    `;
    const users = await sql.query<{ email: string }>(
      `select email from "user" where id = $1`,
      [context.userId],
    );
    const isAdmin = (admins[0]?.c ?? 0) === 0 || users[0]?.email?.toLowerCase() === ADMIN_EMAIL;
    await sql`
      insert into farmer_profiles (user_id, full_name, is_admin)
      values (${context.userId}, ${""}, ${isAdmin})
    `;
    await seedWelcome(context.userId);
    const created = await sql<FarmerProfile>`
      select user_id, full_name, mobile_number, farmer_id, date_of_birth, gender,
             village, taluka, district, state, pincode, land_area, main_crop,
             is_admin, notify_weather, notify_market, notify_schemes
      from farmer_profiles where user_id = ${context.userId}
    `;
    return ensureAdminFlag(context.userId, created[0]);
  });

const profileInput = z.object({
  full_name: z.string().min(1).optional(),
  mobile_number: z.string().optional(),
  farmer_id: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  land_area: z.string().optional(),
  main_crop: z.string().optional(),
  notify_weather: z.boolean().optional(),
  notify_market: z.boolean().optional(),
  notify_schemes: z.boolean().optional(),
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(profileInput)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<FarmerProfile>`
      select user_id, full_name, mobile_number, farmer_id, date_of_birth, gender,
             village, taluka, district, state, pincode, land_area, main_crop,
             is_admin, notify_weather, notify_market, notify_schemes
      from farmer_profiles where user_id = ${context.userId}
    `;
    const prev = existing[0];
    if (!prev) {
      const admins = await sql<{ c: number }>`
        select count(*)::int as c from farmer_profiles where is_admin = true
      `;
      const users = await sql.query<{ email: string }>(
        `select email from "user" where id = $1`,
        [context.userId],
      );
      const isAdmin = (admins[0]?.c ?? 0) === 0 || users[0]?.email?.toLowerCase() === ADMIN_EMAIL;
      await sql`
        insert into farmer_profiles (user_id, full_name, is_admin)
        values (${context.userId}, ${data.full_name ?? ""}, ${isAdmin})
      `;
      await seedWelcome(context.userId);
    }
    const merged = {
      full_name: data.full_name ?? prev?.full_name ?? "",
      mobile_number: data.mobile_number ?? prev?.mobile_number ?? null,
      farmer_id: data.farmer_id ?? prev?.farmer_id ?? null,
      date_of_birth: data.date_of_birth ?? prev?.date_of_birth ?? null,
      gender: data.gender ?? prev?.gender ?? null,
      village: data.village ?? prev?.village ?? null,
      taluka: data.taluka ?? prev?.taluka ?? null,
      district: data.district ?? prev?.district ?? null,
      state: data.state ?? prev?.state ?? "Maharashtra",
      pincode: data.pincode ?? prev?.pincode ?? null,
      land_area: data.land_area ?? prev?.land_area ?? null,
      main_crop: data.main_crop ?? prev?.main_crop ?? null,
      notify_weather: data.notify_weather ?? prev?.notify_weather ?? true,
      notify_market: data.notify_market ?? prev?.notify_market ?? true,
      notify_schemes: data.notify_schemes ?? prev?.notify_schemes ?? true,
    };
    await sql`
      insert into farmer_profiles (
        user_id, full_name, mobile_number, farmer_id, date_of_birth, gender,
        village, taluka, district, state, pincode, land_area, main_crop,
        notify_weather, notify_market, notify_schemes, updated_at
      ) values (
        ${context.userId},
        ${merged.full_name},
        ${merged.mobile_number},
        ${merged.farmer_id},
        ${merged.date_of_birth},
        ${merged.gender},
        ${merged.village},
        ${merged.taluka},
        ${merged.district},
        ${merged.state},
        ${merged.pincode},
        ${merged.land_area},
        ${merged.main_crop},
        ${merged.notify_weather},
        ${merged.notify_market},
        ${merged.notify_schemes},
        now()
      )
      on conflict (user_id) do update set
        full_name = excluded.full_name,
        mobile_number = excluded.mobile_number,
        farmer_id = excluded.farmer_id,
        date_of_birth = excluded.date_of_birth,
        gender = excluded.gender,
        village = excluded.village,
        taluka = excluded.taluka,
        district = excluded.district,
        state = excluded.state,
        pincode = excluded.pincode,
        land_area = excluded.land_area,
        main_crop = excluded.main_crop,
        notify_weather = excluded.notify_weather,
        notify_market = excluded.notify_market,
        notify_schemes = excluded.notify_schemes,
        updated_at = now()
    `;
    if (prev) await ensureAdminFlag(context.userId, prev);
    return { ok: true as const };
  });

export type FarmerListRow = FarmerProfile & {
  email: string | null;
  listing_count: number;
  visit_count: number;
};

export type FarmerAdminDetail = {
  profile: FarmerProfile;
  email: string | null;
  listings: {
    id: number;
    equipment_name: string;
    category: string;
    status: string;
    listing_type: string;
  }[];
  usage: { feature: string; count: number; last_used_at: string }[];
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

export const listFarmers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const farmers = await sql.query<FarmerListRow>(
      `select p.user_id, p.full_name, p.mobile_number, p.farmer_id, p.date_of_birth, p.gender,
              p.village, p.taluka, p.district, p.state, p.pincode, p.land_area, p.main_crop,
              p.is_admin, p.notify_weather, p.notify_market, p.notify_schemes,
              u.email,
              coalesce((select count(*) from equipment e where e.user_id = p.user_id), 0)::int as listing_count,
              coalesce((select sum(count) from feature_usage f where f.user_id = p.user_id), 0)::int as visit_count
       from farmer_profiles p
       left join "user" u on u.id = p.user_id
       order by p.created_at desc`,
    );
    return {
      allowed: true as const,
      farmers: farmers.map((f) => ({ ...f, is_admin: coerceAdminFlag(f.is_admin) })),
    };
  });

export const getFarmerAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ context, data }): Promise<FarmerAdminDetail | null> => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<FarmerProfile>`
      select user_id, full_name, mobile_number, farmer_id, date_of_birth, gender,
             village, taluka, district, state, pincode, land_area, main_crop,
             is_admin, notify_weather, notify_market, notify_schemes
      from farmer_profiles where user_id = ${data.userId}
    `;
    if (!rows[0]) return null;
    const profile = { ...rows[0], is_admin: coerceAdminFlag(rows[0].is_admin) };
    const users = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [
      data.userId,
    ]);
    const listings = await sql.query<FarmerAdminDetail["listings"][number]>(
      `select id, equipment_name, category, status, coalesce(listing_type, 'rent') as listing_type
       from equipment where user_id = $1 order by id desc`,
      [data.userId],
    );
    const usage = await sql.query<FarmerAdminDetail["usage"][number]>(
      `select feature, count, last_used_at::text as last_used_at
       from feature_usage where user_id = $1 order by count desc`,
      [data.userId],
    );
    return { profile, email: users[0]?.email ?? null, listings, usage };
  });

export const deleteFarmer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const sql = await getSql();
    const users = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [
      data.userId,
    ]);
    if (isAdminEmail(users[0]?.email)) throw new Error("The main admin account cannot be deleted");
    await sql`delete from notifications where user_id = ${data.userId}`;
    await sql`delete from feature_usage where user_id = ${data.userId}`;
    await sql`delete from equipment where user_id = ${data.userId}`;
    await sql`delete from farmer_profiles where user_id = ${data.userId}`;
    await sql.query(`delete from "session" where "userId" = $1`, [data.userId]);
    await sql.query(`delete from "account" where "userId" = $1`, [data.userId]);
    await sql.query(`delete from "user" where id = $1`, [data.userId]);
    return { ok: true as const };
  });
