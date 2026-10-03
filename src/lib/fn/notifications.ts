import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type Notice = {
  id: number;
  kind: string;
  title: string;
  message: string;
  unread: boolean;
  created_at: string;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<Notice>`
      select id, kind, title, message, unread, created_at
      from notifications
      where user_id = ${context.userId}
      order by id desc
    `;
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      update notifications set unread = false where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      delete from notifications where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });
