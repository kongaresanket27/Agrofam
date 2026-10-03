import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  DATA_GOV_BASE,
  getDataGovKey,
  getDataGovResourceId,
} from "@/lib/secrets.server";

export type MandiRow = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
};

const SAMPLE: MandiRow[] = [
  {
    state: "Maharashtra",
    district: "Pune",
    market: "Pune",
    commodity: "Onion",
    variety: "Red",
    arrival_date: "09/09/2026",
    min_price: "1400",
    max_price: "2200",
    modal_price: "1850",
  },
  {
    state: "Maharashtra",
    district: "Pune",
    market: "Pune",
    commodity: "Wheat",
    variety: "Local",
    arrival_date: "09/09/2026",
    min_price: "2450",
    max_price: "2680",
    modal_price: "2550",
  },
  {
    state: "Maharashtra",
    district: "Nashik",
    market: "Lasalgaon",
    commodity: "Onion",
    variety: "Nasik Red",
    arrival_date: "09/09/2026",
    min_price: "1200",
    max_price: "1900",
    modal_price: "1550",
  },
  {
    state: "Maharashtra",
    district: "Pune",
    market: "Pune",
    commodity: "Tomato",
    variety: "Local",
    arrival_date: "09/09/2026",
    min_price: "800",
    max_price: "1400",
    modal_price: "1100",
  },
  {
    state: "Gujarat",
    district: "Rajkot",
    market: "Rajkot",
    commodity: "Cotton",
    variety: "Shankar-6",
    arrival_date: "08/09/2026",
    min_price: "6800",
    max_price: "7400",
    modal_price: "7100",
  },
];

export const getCropPrices = createServerFn({ method: "POST" })
  .validator(
    z.object({
      state: z.string().optional(),
      district: z.string().optional(),
      commodity: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const resource = getDataGovResourceId();
    const key = getDataGovKey();
    const url = new URL(`${DATA_GOV_BASE}/resource/${resource}`);
    url.searchParams.set("api-key", key);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "80");
    url.searchParams.set("sort[Arrival_Date]", "desc");
    if (data.state) url.searchParams.set("filters[State]", data.state);
    if (data.district) url.searchParams.set("filters[District]", data.district);
    if (data.commodity) url.searchParams.set("filters[Commodity]", data.commodity);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "AgroFam/1.0",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as {
        records?: Array<Record<string, string>>;
      };
      const rows: MandiRow[] = [];
      for (const record of json.records ?? []) {
        if (
          data.district &&
          record.District?.toLowerCase() !== data.district.toLowerCase()
        ) {
          continue;
        }
        if (
          data.commodity &&
          record.Commodity?.toLowerCase() !== data.commodity.toLowerCase()
        ) {
          continue;
        }
        rows.push({
          state: record.State ?? "",
          district: record.District ?? "",
          market: record.Market ?? "",
          commodity: record.Commodity ?? "",
          variety: record.Variety ?? "",
          arrival_date: record.Arrival_Date ?? "",
          min_price: String(record.Min_Price ?? ""),
          max_price: String(record.Max_Price ?? ""),
          modal_price: String(record.Modal_Price ?? ""),
        });
      }
      if (rows.length > 0) {
        return { success: true as const, source: "live" as const, count: rows.length, data: rows };
      }
    } catch {
      /* fall through to sample */
    }

    const filtered = SAMPLE.filter((row) => {
      if (data.state && row.state.toLowerCase() !== data.state.toLowerCase()) return false;
      if (data.district && row.district.toLowerCase() !== data.district.toLowerCase())
        return false;
      if (data.commodity && row.commodity.toLowerCase() !== data.commodity.toLowerCase())
        return false;
      return true;
    });
    const dataRows = filtered.length > 0 ? filtered : SAMPLE;
    return {
      success: true as const,
      source: "sample" as const,
      count: dataRows.length,
      data: dataRows,
    };
  });
