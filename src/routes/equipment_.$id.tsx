import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Combine, Droplets, MapPin, Phone, Settings, Star, Tractor, User } from "lucide-react";
import { toast } from "sonner";
import { AuthWall } from "@/components/auth-wall";
import { Shell } from "@/components/shell";
import { deleteEquipment, getEquipment, type Equipment } from "@/lib/fn/equipment";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/equipment_/$id")({ component: DetailsPage });

function DetailsPage() {
  return (
    <AuthWall>
      <Details />
    </AuthWall>
  );
}

function banner(item: Equipment) {
  const c = item.category.toLowerCase();
  if (c.includes("harvest")) return { cls: "from-emerald-400 to-green-600", Icon: Combine };
  if (c.includes("spray")) return { cls: "from-cyan-400 to-sky-500", Icon: Droplets };
  if (c.includes("implement") || c.includes("rotav")) return { cls: "from-blue-400 to-indigo-500", Icon: Settings };
  return { cls: "from-amber-300 to-orange-400", Icon: Tractor };
}

function Details() {
  const { id } = Route.useParams();
  const user = useCurrentUser();
  const [item, setItem] = useState<Equipment | null | undefined>(undefined);

  useEffect(() => {
    void getEquipment({ data: { id: Number(id) } })
      .then(setItem)
      .catch(() => setItem(null));
  }, [id]);

  async function remove() {
    if (!item) return;
    try {
      await deleteEquipment({ data: { id: item.id } });
      toast.success("Listing removed");
      setItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove listing");
    }
  }

  if (item === undefined) {
    return (
      <Shell>
        <p className="text-sm text-muted">Loading…</p>
      </Shell>
    );
  }
  if (item === null) {
    return (
      <Shell>
        <p>Equipment not found.</p>
      </Shell>
    );
  }

  const b = banner(item);
  const rt = 4.2 + ((item.id * 17) % 8) / 10;

  return (
    <Shell>
      <Link to="/equipment" className="text-sm text-muted">
        ← Back to Equipment
      </Link>
      {item.status !== "approved" ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {item.status === "pending"
            ? "Waiting for admin verification. Other farmers cannot see this yet."
            : "This listing was not approved."}
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          {item.photos?.[0] ? (
            <img
              src={item.photos[0]}
              alt={item.equipment_name}
              className="h-56 w-full rounded-3xl object-cover"
            />
          ) : (
            <div className={`grid h-56 place-items-center rounded-3xl bg-linear-to-br ${b.cls} text-white`}>
              <b.Icon className="size-24" />
            </div>
          )}
          {item.photos && item.photos.length > 1 ? (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Accessories</p>
              <div className="grid grid-cols-4 gap-2">
                {item.photos.slice(1).map((src, i) => (
                  <img key={i} src={src} alt={`Accessory ${i + 1}`} className="h-20 w-full rounded-2xl object-cover" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="card-shadow rounded-3xl bg-surface p-5">
          <p className="font-semibold">Rental Rates</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between rounded-2xl bg-chip px-4 py-3">
              <span>Per Day</span>
              <span className="font-bold tabular-nums">₹{item.rent_per_day}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-chip px-4 py-3">
              <span>Per Hour</span>
              <span className="font-bold tabular-nums">₹{item.rent_per_hour}</span>
            </div>
          </div>
          <a
            href={item.owner_mobile ? `tel:${item.owner_mobile}` : undefined}
            onClick={(e) => {
              if (!item.owner_mobile) {
                e.preventDefault();
                toast.error("Owner mobile is not listed yet");
                return;
              }
              toast.success("Call the owner to book this machine");
            }}
            className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white"
          >
            Book Now
          </a>
        </div>
        <div className="card-shadow rounded-3xl bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-semibold capitalize">
              {item.listing_type}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              {item.availability ? "Available" : "Busy"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{item.equipment_name}</h1>
          <p className="text-muted">{item.brand}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-accent">
            <Star className="size-3.5 fill-current" /> {rt.toFixed(1)}
          </p>
          <p className="mt-3 text-sm">{item.description}</p>
        </div>
        <div className="card-shadow rounded-3xl bg-surface p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <User className="size-4" /> Contact Owner
          </p>
          <p className="mt-2 font-medium">{item.owner_name}</p>
          <p className="mt-2 flex items-center gap-2 rounded-2xl bg-chip px-3 py-2">
            <Phone className="size-4 text-primary" /> {item.owner_mobile}
          </p>
          <p className="mt-2 flex items-center gap-2 text-muted">
            <MapPin className="size-4" />
            {[item.village, item.taluka, item.district].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>
      {user?.id === item.user_id ? (
        <button
          type="button"
          onClick={() => void remove()}
          className="mt-4 rounded-full border border-accent px-4 py-2 text-sm text-accent"
        >
          Remove my listing
        </button>
      ) : null}
    </Shell>
  );
}
