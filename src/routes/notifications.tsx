import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CloudRain, Leaf, Tractor, University } from "lucide-react";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import {
  deleteNotification,
  listNotifications,
  markAllRead,
  type Notice,
} from "@/lib/fn/notifications";

export const Route = createFileRoute("/notifications")({
  component: NoticesPage,
});

function NoticesPage() {
  return (
    <AuthWall>
      <Notices />
    </AuthWall>
  );
}

function Notices() {
  const [items, setItems] = useState<Notice[]>([]);

  function refresh() {
    void listNotifications().then(setItems);
  }

  useEffect(() => {
    refresh();
  }, []);

  const icon = (kind: string) => {
    if (kind === "weather") return CloudRain;
    if (kind === "market") return Leaf;
    if (kind === "equipment") return Tractor;
    return University;
  };

  return (
    <Shell title="Alerts">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => void markAllRead().then(refresh)}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm"
        >
          Mark all read
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No alerts yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const Icon = icon(n.kind);
            return (
              <li
                key={n.id}
                className="flex gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <Icon className="mt-0.5 size-5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold">
                    {n.title}
                    {n.unread ? (
                      <span className="ml-2 inline-block size-2 rounded-full bg-accent" />
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">{n.message}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted"
                  onClick={() => void deleteNotification({ data: { id: n.id } }).then(refresh)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
