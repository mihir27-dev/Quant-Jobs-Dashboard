// lib/filtering.ts
// Pure, framework-agnostic filtering + URL (de)serialization.
// No React, no Next, no I/O — trivially unit-testable in isolation.

import type { Job, FirmTier, RoleType } from "./types";

export const TIERS: FirmTier[] = ["SSS", "SS", "S"];
export const ROLES: RoleType[] = ["Researcher", "Trader", "Developer", "Data Scientist"];
export const LOCATIONS = ["NYC", "London", "Chicago", "Singapore", "Hong Kong", "Amsterdam", "Sydney", "Gurugram", "Shanghai", "Montreal", "Remote", "Other"] as const;
export const LANGUAGES = ["C++", "Python", "Rust", "OCaml"] as const;

export type SortKey = "recent" | "tier";

export interface Filters {
  tiers: string[];
  roles: string[];
  locations: string[];
  languages: string[];
  firms: string[];
  q: string;
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = {
  tiers: [],
  roles: [],
  locations: [],
  languages: [],
  firms: [],
  q: "",
  sort: "recent",
};

const TIER_RANK: Record<FirmTier, number> = { SSS: 0, SS: 1, S: 2 };

/** Apply all active facets + free-text query, then sort. Order-independent. */
export function filterJobs(jobs: Job[], f: Filters): Job[] {
  const q = f.q.trim().toLowerCase();

  const matched = jobs.filter((j) => {
    if (f.tiers.length && !f.tiers.includes(j.tier)) return false;
    if (f.roles.length && !f.roles.includes(j.role)) return false;
    if (f.locations.length && !f.locations.includes(j.locationGroup)) return false;
    // languages are OR within the facet: match if the job lists ANY selected lang
    if (f.languages.length && !f.languages.some((l) => j.languages.includes(l))) return false;
    if (f.firms.length && !f.firms.includes(j.firm)) return false;
    if (q && !`${j.firm} ${j.title} ${j.role}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return [...matched].sort((a, b) =>
    f.sort === "recent"
      ? +new Date(b.postedAt) - +new Date(a.postedAt) // newest first
      : TIER_RANK[a.tier] - TIER_RANK[b.tier] // SSS → SS → S
  );
}

export function activeFilterCount(f: Filters): number {
  return (
    f.tiers.length +
    f.roles.length +
    f.locations.length +
    f.languages.length +
    f.firms.length +
    (f.q.trim() ? 1 : 0)
  );
}

// ---------------------------------------------------------------------------
// URL (de)serialization
// Canonical shape: ?tier=SSS,SS&role=Trader&loc=NYC&lang=C%2B%2B&firm=Jane+Street&q=options&sort=tier
// Empty/default values are omitted so clean views produce a clean URL.
// ---------------------------------------------------------------------------

export function filtersToSearchParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.tiers.length) p.set("tier", f.tiers.join(","));
  if (f.roles.length) p.set("role", f.roles.join(","));
  if (f.locations.length) p.set("loc", f.locations.join(","));
  if (f.languages.length) p.set("lang", f.languages.join(","));
  if (f.firms.length) p.set("firm", f.firms.join(","));
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.sort !== "recent") p.set("sort", f.sort);
  return p;
}

export function searchParamsToFilters(p: URLSearchParams): Filters {
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(",").filter(Boolean) : []);
  return {
    tiers: list("tier"),
    roles: list("role"),
    locations: list("loc"),
    languages: list("lang"),
    firms: list("firm"),
    q: p.get("q") ?? "",
    sort: p.get("sort") === "tier" ? "tier" : "recent",
  };
}
