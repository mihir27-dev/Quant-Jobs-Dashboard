// lib/types.ts
// Shared domain types. Every pipeline/lib module imports from here.

export type FirmTier = "SSS" | "SS" | "S";
export type RoleType = "Researcher" | "Trader" | "Developer" | "Data Scientist";
export type WorkMode = "On-site" | "Hybrid" | "Remote";

export interface Job {
  id: string; // stable: `${source}:${externalId}`
  firm: string;
  tier: FirmTier; // curated from a firm→tier map, not scraped
  title: string;
  role: RoleType; // normalized from the raw title at ingest time
  location: string; // raw display string, e.g. "New York, NY"
  locationGroup: string; // bucketed facet: NYC | London | Chicago | Singapore | Remote | Other
  workMode: WorkMode;
  languages: string[]; // extracted from the JD text
  skills?: string[]; // e.g. ["Statistical Arbitrage","Machine Learning"]
  compRange?: string;
  snippet: string; // truncated requirements blurb
  description?: string; // full job description
  applyUrl: string;
  source: "greenhouse" | "lever" | "ashby" | "custom";
  postedAt: string; // ISO 8601
  scrapedAt: string; // ISO 8601
}
