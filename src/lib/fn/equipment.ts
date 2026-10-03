import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { coerceAdminFlag, isAdminEmail } from "@/lib/admin-account";
import { parsePhotos } from "@/lib/photos";

export type Equipment = {
  id: number;
  user_id: string;
  equipment_name: string;
  category: string;
  brand: string | null;
  description: string | null;
  buy_price: string | null;
  rent_per_day: string | null;
  rent_per_hour: string | null;
  owner_name: string | null;
  owner_mobile: string | null;
  owner_address: string | null;
  district: string | null;
  taluka: string | null;
  village: string | null;
  image_url: string | null;
  photos: string[];
  availability: boolean;
  status: string;
  listing_type: string;
};

const SELECT = `id, user_id, equipment_name, category, brand, description,
  buy_price::text as buy_price, rent_per_day::text as rent_per_day,
  rent_per_hour::text as rent_per_hour, owner_name, owner_mobile,
  owner_address, district, taluka, village, image_url, photos, availability, status,
  coalesce(listing_type, 'rent') as listing_type`;

type EquipmentRow = Omit<Equipment, "photos"> & { photos: string | string[] | null };

function asEquipment(rows: EquipmentRow[]): Equipment[] {
  return rows.map((row) => ({
    ...row,
    photos: parsePhotos(row.photos, row.image_url),
  }));
}

async function isAdmin(userId: string) {
  const sql = await getSql();
  const me = await sql<{ is_admin: boolean }>`
    select is_admin from farmer_profiles where user_id = ${userId}
  `;
  if (coerceAdminFlag(me[0]?.is_admin)) return true;
  const users = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
  return isAdminEmail(users[0]?.email);
}

export const listEquipment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      district: z.string().optional(),
      taluka: z.string().optional(),
      category: z.string().optional(),
      q: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const all = asEquipment(
      await sql.query<EquipmentRow>(
        `select ${SELECT} from equipment where status = 'approved' order by id desc`,
      ),
    );
    return all.filter((item) => {
      if (data.district && item.district?.toLowerCase() !== data.district.toLowerCase())
        return false;
      if (data.taluka && item.taluka?.toLowerCase() !== data.taluka.toLowerCase())
        return false;
      if (data.category && item.category.toLowerCase() !== data.category.toLowerCase())
        return false;
      if (data.q) {
        const q = data.q.toLowerCase();
        const blob = `${item.equipment_name} ${item.brand ?? ""} ${item.description ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  });

export const listMyEquipment = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return asEquipment(
      await sql.query<EquipmentRow>(
        `select ${SELECT} from equipment where user_id = $1 order by id desc`,
        [context.userId],
      ),
    );
  });

export const listAdminEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
  .handler(async ({ context, data }) => {
    if (!(await isAdmin(context.userId))) {
      return { allowed: false as const, items: [] as Equipment[] };
    }
    const sql = await getSql();
    const items = asEquipment(
      data.status
        ? await sql.query<EquipmentRow>(
            `select ${SELECT} from equipment where status = $1 order by id desc`,
            [data.status],
          )
        : await sql.query<EquipmentRow>(`select ${SELECT} from equipment order by id desc`),
    );
    return { allowed: true as const, items };
  });

export const getEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = asEquipment(
      await sql.query<EquipmentRow>(`select ${SELECT} from equipment where id = $1`, [data.id]),
    );
    const item = rows[0];
    if (!item) return null;
    if (item.status === "approved") return item;
    if (item.user_id === context.userId || (await isAdmin(context.userId))) return item;
    return null;
  });

function money(value?: string) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("Price must be a valid amount");
  return n.toFixed(2);
}

export const addEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      equipment_name: z.string().min(1).max(120),
      category: z.string().min(1).max(40),
      listing_type: z.enum(["rent", "sale", "both"]).default("rent"),
      brand: z.string().max(80).optional(),
      description: z.string().max(800).optional(),
      buy_price: z.string().optional(),
      rent_per_day: z.string().optional(),
      rent_per_hour: z.string().optional(),
      photos: z.array(z.string().startsWith("data:image/").max(500_000)).max(6).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const buy = money(data.buy_price);
    const day = money(data.rent_per_day);
    const hour = money(data.rent_per_hour);
    if (data.listing_type !== "sale" && !day && !hour) {
      throw new Error("Add a rent price");
    }
    if (data.listing_type !== "rent" && !buy) {
      throw new Error("Add a sale price");
    }
    const photos = parsePhotos(data.photos ?? []);
    const sql = await getSql();
    const profile = await sql<{
      full_name: string;
      mobile_number: string | null;
      village: string | null;
      taluka: string | null;
      district: string | null;
      state: string | null;
    }>`
      select full_name, mobile_number, village, taluka, district, state
      from farmer_profiles where user_id = ${context.userId}
    `;
    const p = profile[0];
    const admin = await isAdmin(context.userId);
    const status = admin ? "approved" : "pending";
    const rows = await sql.query<{ id: number }>(
      `insert into equipment (
        user_id, equipment_name, category, brand, description,
        buy_price, rent_per_day, rent_per_hour, owner_name, owner_mobile,
        owner_address, district, taluka, village, image_url, photos, status, listing_type
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      returning id`,
      [
        context.userId,
        data.equipment_name.trim(),
        data.category,
        data.brand?.trim() || null,
        data.description?.trim() || null,
        buy,
        day,
        hour,
        p?.full_name || "Farmer",
        p?.mobile_number || null,
        [p?.village, p?.district, p?.state].filter(Boolean).join(", ") || null,
        p?.district ?? null,
        p?.taluka ?? null,
        p?.village ?? null,
        photos[0] ?? null,
        JSON.stringify(photos),
        status,
        data.listing_type,
      ],
    );
    return { id: rows[0].id, status };
  });

export const reviewEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
    }),
  )
  .handler(async ({ context, data }) => {
    if (!(await isAdmin(context.userId))) {
      throw new Error("Admin only");
    }
    const sql = await getSql();
    const rows = await sql.query<Equipment>(`select ${SELECT} from equipment where id = $1`, [
      data.id,
    ]);
    const item = rows[0];
    if (!item) throw new Error("Listing not found");
    if (item.status === data.status) return { ok: true as const };
    await sql`update equipment set status = ${data.status} where id = ${data.id}`;
    const ok = data.status === "approved";
    await sql`
      insert into notifications (user_id, kind, title, message) values
      (
        ${item.user_id},
        'equipment',
        ${ok ? "Listing approved" : "Listing not approved"},
        ${
          ok
            ? `${item.equipment_name} is now visible in the equipment yard.`
            : `${item.equipment_name} was not approved. Remove it or send it again from Your listings.`
        }
      )
    `;
    return { ok: true as const };
  });

export const resubmitEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query<{ id: number }>(
      `update equipment set status = 'pending'
       where id = $1 and user_id = $2 and status = 'rejected'
       returning id`,
      [data.id, context.userId],
    );
    if (!rows[0]) throw new Error("Only your rejected listings can be sent again");
    return { ok: true as const };
  });

export const deleteEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (await isAdmin(context.userId)) {
      await sql`delete from equipment where id = ${data.id}`;
      return { ok: true as const };
    }
    const rows = await sql.query<{ id: number }>(
      `delete from equipment where id = $1 and user_id = $2 returning id`,
      [data.id, context.userId],
    );
    if (!rows[0]) throw new Error("You can only remove your own listing");
    return { ok: true as const };
  });
