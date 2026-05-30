import React, { Suspense } from "react";
import JobBoard from "./JobBoard";
import { ACTIVE_FIRMS } from "@/pipeline/firms";
import { fetchPostings } from "@/pipeline/sources";
import { assembleJob } from "@/pipeline/normalize";
import { validateJobs } from "@/pipeline/schema";
import { JOBS } from "@/lib/sampleJobs";

const globalForJobs = globalThis as unknown as {
  cachedJobs: any[] | undefined;
  cacheTime: number | undefined;
  schedulerStarted: boolean | undefined;
};

export const dynamic = "force-dynamic";

/** Scrapes jobs from active ATS boards, validates, and merges fallbacks. */
async function runScrapeJobs(): Promise<any[]> {
  console.log("[Aggregator] Commencing fresh scrape from active ATS boards...");
  const settled = await Promise.allSettled(
    ACTIVE_FIRMS.map(async (firm) => {
      try {
        const raw = await fetchPostings(firm);
        return raw.map((r) => assembleJob(r, firm)).filter((j) => j !== null);
      } catch (err) {
        console.error(`Error fetching for firm ${firm.name}:`, err);
        throw err;
      }
    })
  );

  const jobs: any[] = [];
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      jobs.push(...res.value);
    } else {
      console.error(`Failed to load postings for firm ${ACTIVE_FIRMS[i].name}`);
    }
  });

  const { valid } = validateJobs(jobs);

  // Hybrid fallback mechanism: merge live listings with sample data for non-scrapeable or failed boards
  const fetchedFirms = new Set(valid.map((j) => j.firm));
  const fallbacks: any[] = [];
  const targetFirms = Array.from(new Set(JOBS.map((j) => j.firm)));

  for (const firmName of targetFirms) {
    if (!fetchedFirms.has(firmName)) {
      const firmSamples = JOBS.filter((j) => j.firm === firmName);
      fallbacks.push(...firmSamples);
    }
  }

  return [...valid, ...fallbacks];
}

// Start background cache warming scheduler when the server process starts
if (typeof window === "undefined" && !globalForJobs.schedulerStarted) {
  globalForJobs.schedulerStarted = true;
  console.log("[Scheduler] Initializing background warming (interval: 5m)...");
  
  // Run initial prefetch asynchronously on startup to prime the cache
  runScrapeJobs()
    .then((fresh) => {
      globalForJobs.cachedJobs = fresh;
      globalForJobs.cacheTime = Date.now();
      console.log(`[Scheduler] Startup warm completed. Cached ${fresh.length} jobs.`);
    })
    .catch((err) => {
      console.error("[Scheduler] Startup warm failed:", err);
    });

  // Schedule regular updates every 5 minutes
  setInterval(async () => {
    console.log("[Scheduler] Warming cache in background...");
    try {
      const fresh = await runScrapeJobs();
      globalForJobs.cachedJobs = fresh;
      globalForJobs.cacheTime = Date.now();
      console.log(`[Scheduler] Background scrape completed. Cached ${fresh.length} jobs.`);
    } catch (err) {
      console.error("[Scheduler] Background warming failed:", err);
    }
  }, 5 * 60 * 1000);
}

async function getLiveJobs() {
  const now = Date.now();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  // Serve from cache if valid
  if (globalForJobs.cachedJobs && globalForJobs.cacheTime && (now - globalForJobs.cacheTime < CACHE_TTL)) {
    console.log(`[Cache Hit] Serving ${globalForJobs.cachedJobs.length} jobs instantly`);
    return globalForJobs.cachedJobs;
  }

  // If cache is expired or empty, perform synchronous scrape
  console.log("[Cache Miss] Performing sync scrape...");
  try {
    const fresh = await runScrapeJobs();
    globalForJobs.cachedJobs = fresh;
    globalForJobs.cacheTime = now;
    return fresh;
  } catch (err) {
    console.error("[Cache Miss] Sync scrape failed. Attempting cache fallback...", err);
    if (globalForJobs.cachedJobs) {
      console.log("[Cache Fallback] Serving stale cache data");
      return globalForJobs.cachedJobs;
    }
    throw err;
  }
}

function FeedSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-1">
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-2 w-28 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-64 bg-slate-100 rounded-lg animate-pulse hidden md:block" />
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-6 w-12 bg-slate-200/60 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden h-[calc(100vh-61px)]">
        {/* Sidebar Filter Skeleton */}
        <aside className="w-64 bg-white border-r border-slate-200/80 p-5 hidden md:flex flex-col gap-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
          </div>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="space-y-1.5 pl-1">
                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </aside>

        {/* Listings column Skeleton */}
        <section className="w-full md:w-80 lg:w-[380px] flex-shrink-0 border-r border-slate-200/80 bg-slate-50 flex flex-col h-full overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-200/50 flex items-center justify-between flex-shrink-0">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse md:hidden" />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rounded-xl border border-slate-200/80 p-4 bg-white space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex gap-2">
                      <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 w-8 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-4/5 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-200/80 animate-pulse flex-shrink-0" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Details Pane Skeleton */}
        <section className="flex-1 bg-white hidden md:flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="border-b border-slate-100 pb-5 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2.5 flex-1">
                  <div className="flex gap-2">
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse" />
                  <div className="flex gap-4">
                    <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="flex gap-3 pt-2">
                <div className="h-10 w-36 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-200 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-16 w-full bg-slate-100/50 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-16 w-full bg-slate-100/50 rounded animate-pulse" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-48 w-full bg-slate-100/50 rounded-xl animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

async function LiveJobBoard() {
  let initialJobs: any[] = [];
  try {
    initialJobs = await getLiveJobs();
  } catch (err) {
    console.error("Failed to load live jobs:", err);
  }
  return <JobBoard initialJobs={initialJobs} />;
}

export default function Page() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <LiveJobBoard />
    </Suspense>
  );
}
