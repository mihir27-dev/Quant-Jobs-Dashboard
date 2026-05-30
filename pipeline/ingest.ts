// pipeline/ingest.ts
import type { Job } from "@/lib/types";
import { ACTIVE_FIRMS } from "./firms";
import { fetchPostings } from "./sources";
import { assembleJob } from "./normalize";
import { validateJobs } from "./schema";

/**
 * Storage adapter — implement against Postgres/Prisma, SQLite/Drizzle, etc.
 * The pipeline stays storage-agnostic.
 */
export interface JobStore {
  upsertMany(jobs: Job[]): Promise<number>;
  deactivateStale(seenIds: string[], runAt: string): Promise<number>;
}

export interface IngestResult {
  fetched: number;
  valid: number;
  invalid: number;
  ingested: number;
  deactivated: number;
  errors: Array<{ firm: string; message: string }>;
}

/** Collapse near-duplicate cross-postings (same firm + title + location). */
function dedupeKey(j: Job): string {
  return `${j.firm}::${j.title}::${j.locationGroup}`.toLowerCase().replace(/\s+/g, " ");
}

export async function runIngest(store: JobStore): Promise<IngestResult> {
  const runAt = new Date().toISOString();
  const errors: IngestResult["errors"] = [];

  // Fetch firms in parallel but ISOLATE failures so one broken board never
  // sinks the run (token rotated, ATS migrated, rate-limited, timeout…).
  const settled = await Promise.allSettled(
    ACTIVE_FIRMS.map(async (firm) => {
      const raw = await fetchPostings(firm);
      return raw.map((r) => assembleJob(r, firm)).filter((j): j is Job => j !== null);
    })
  );

  const assembled: Job[] = [];
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") assembled.push(...res.value);
    else errors.push({ firm: ACTIVE_FIRMS[i].name, message: String(res.reason) });
  });

  // 1) Validate at the boundary — drop malformed rows loudly, don't persist them.
  const { valid, invalid } = validateJobs(assembled);
  if (invalid.length) {
    errors.push({ firm: "validation", message: `${invalid.length} rows failed schema` });
  }

  // 2) Dedup by stable id, then collapse near-duplicate cross-postings.
  const byId = Array.from(new Map(valid.map((j) => [j.id, j])).values());
  const deduped = Array.from(new Map(byId.map((j) => [dedupeKey(j), j])).values());

  const ingested = await store.upsertMany(deduped);
  const deactivated = await store.deactivateStale(
    deduped.map((j) => j.id),
    runAt
  );

  return {
    fetched: assembled.length,
    valid: valid.length,
    invalid: invalid.length,
    ingested,
    deactivated,
    errors,
  };
}
