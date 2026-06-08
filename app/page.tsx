import React, { Suspense } from "react";
import ModernJobBoard from "./ModernJobBoard";
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
    <div className="h-screen h-[100dvh] flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse hidden sm:block" />
        </div>
        <div className="flex-1 max-w-md mx-6">
          <div className="h-9 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse lg:hidden" />
      </header>

      <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-6 flex-col gap-8 hidden lg:flex shrink-0">
          <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse mb-8" />
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-3 mb-6">
              <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </aside>

        {/* Feed */}
        <main className="flex-1 flex flex-col md:w-[400px] lg:w-[450px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0c]">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-3" />
                <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                  <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Details Pane */}
        <section className="flex-1 flex-col h-full bg-white dark:bg-[#0a0a0c] hidden md:flex p-10 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-8" />
          <div className="flex gap-3 mb-8">
            <div className="h-10 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-10 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
          <div className="h-48 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse mb-8" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
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
  return <ModernJobBoard initialJobs={initialJobs} />;
}

export default function Page() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <LiveJobBoard />
    </Suspense>
  );
}
