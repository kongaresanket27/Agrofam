import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import allSchemes from "@/data/all-schemes.json";

export type Scheme = {
  id: number;
  scheme_name: string;
  state: string;
  category: string;
  description: string;
  benefits: string;
  eligibility: string[];
  documents: string[];
  application_mode: string;
  official_website: string;
  last_updated: string;
  _scope: string;
  _scope_name: string;
};

export type SchemeCard = {
  id: number;
  scheme_name: string;
  category: string;
  benefits: string;
  _scope: string;
  _scope_name: string;
};

const SCHEMES = allSchemes as Scheme[];

const STATES = [
  ...new Set(SCHEMES.filter((s) => s._scope !== "central").map((s) => s._scope_name)),
].sort();

function asCard(s: Scheme): SchemeCard {
  return {
    id: s.id,
    scheme_name: s.scheme_name,
    category: s.category,
    benefits: (s.benefits ?? "").replace(/\s+/g, " ").slice(0, 80),
    _scope: s._scope,
    _scope_name: s._scope_name,
  };
}

export const listSchemeStates = createServerFn({ method: "GET" }).handler(
  async () => STATES,
);

export const listSchemes = createServerFn({ method: "POST" })
  .validator(
    z.object({
      state: z.string().default("Maharashtra"),
      q: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const q = data.q?.trim().toLowerCase() ?? "";
    const match = (s: Scheme) => {
      if (!q) return true;
      return (
        s.scheme_name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    };
    const central = SCHEMES.filter((s) => s._scope === "central" && match(s)).map(asCard);
    const state = SCHEMES.filter(
      (s) => s._scope_name.toLowerCase() === data.state.toLowerCase() && match(s),
    ).map(asCard);
    return { central, state, states: STATES };
  });

export const getScheme = createServerFn({ method: "POST" })
  .validator(
    z.object({
      scope: z.string(),
      id: z.coerce.number(),
    }),
  )
  .handler(async ({ data }) => {
    const found = SCHEMES.find(
      (s) => s._scope === data.scope && Number(s.id) === data.id,
    );
    return found ?? null;
  });
