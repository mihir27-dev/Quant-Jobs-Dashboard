// pipeline/firms.ts
import type { FirmTier } from "@/lib/types";

export type AtsSource = "greenhouse" | "lever" | "ashby";

export interface FirmConfig {
  /** Canonical display name used everywhere in the app. */
  name: string;
  /** Curated tier — assigned HERE, never derived from the scrape. */
  tier: FirmTier;
  /** Which applicant tracking system the firm posts through. */
  source: AtsSource;
  /**
   * Source-specific board identifier:
   *  - greenhouse: board token  → boards.greenhouse.io/<token>
   *  - lever:      company slug  → api.lever.co/v0/postings/<slug>
   *  - ashby:      org slug      → jobs.ashbyhq.com/<slug>
   */
  boardId: string;
  /** Set false to keep in the registry but skip during ingest. */
  active?: boolean;
}

/**
 * ⚠️  boardId values below are PLACEHOLDERS. Verify each firm's real ATS +
 * token against its live careers page before enabling. Some elite funds
 * (e.g. Renaissance Technologies) run a custom careers site with no public
 * JSON board — those need a bespoke fetcher or are intentionally omitted.
 *
 * Tier assignments are an editorial judgement maintained by you, not data.
 */
export const FIRMS: FirmConfig[] = [
  { name: "Jane Street",            tier: "SSS", source: "greenhouse", boardId: "janestreet" },
  { name: "Tower Research Capital",  tier: "SS",  source: "greenhouse", boardId: "towerresearchcapital" },
  { name: "Flow Traders",           tier: "SS",  source: "greenhouse", boardId: "flowtraders" },
  { name: "Akuna Capital",          tier: "S",   source: "greenhouse", boardId: "akunacapital" },
  { name: "Virtu Financial",        tier: "SS",  source: "greenhouse", boardId: "virtu" },
  { name: "Da Vinci Derivatives",   tier: "S",   source: "greenhouse", boardId: "davinciderivatives" },
  { name: "Maven Securities",       tier: "S",   source: "ashby",      boardId: "maven" },
  { name: "Belvedere Trading",      tier: "S",   source: "lever",      boardId: "belvederetrading" },
];

export const ACTIVE_FIRMS = FIRMS.filter((f) => f.active !== false);

