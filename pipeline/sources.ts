// pipeline/sources.ts
import type { AtsSource, FirmConfig } from "./firms";
import { robustGetJSON, type RobustFetchOptions } from "./http";

/** Normalized raw posting, before tiering/enrichment. */
export interface RawPosting {
  externalId: string;
  title: string;
  location: string;
  description: string; // plain-ish text used for keyword extraction
  applyUrl: string;
  postedAt: string; // ISO 8601
}

const FETCH_OPTS: RobustFetchOptions = {
  headers: {
    "User-Agent": "QuantBoard/1.0 (+aggregator; contact@example.com)",
    Accept: "application/json",
  },
  minHostIntervalMs: 1200, // be polite to each ATS host
  retries: 3,
};

/** Strip HTML tags + decode common entities so we can keyword-scan the body. */
function deHtml(s: string): string {
  if (!s) return "";

  // 1. Recursively decode entities up to 3 levels to handle double-escaped content (e.g. &amp;amp;)
  let decoded = s;
  let prev;
  for (let k = 0; k < 3; k++) {
    prev = decoded;
    decoded = decoded
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#43;/gi, "+")
      .replace(/&nbsp;/gi, " ");
    if (decoded === prev) break;
  }

  // 2. Map block elements and list elements to linebreaks to preserve readable paragraphs
  let formatted = decoded
    .replace(/<\/p>|<\/div>|<\/li>|<br\s*\/?>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<ul[^>]*>|<ol[^>]*>/gi, "\n")
    .replace(/<\/ul>|<\/ol>/gi, "\n");

  // 3. Strip all other HTML tags
  let stripped = formatted.replace(/<[^>]+>/g, " ");

  // 4. Clean up spaces while preserving line breaks
  return stripped
    .split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== "")) // remove duplicate empty lines
    .join("\n")
    .trim();
}


// Greenhouse: single call returns the full board.
// GET https://boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true
async function fetchGreenhouse(c: FirmConfig): Promise<RawPosting[]> {
  const data = await robustGetJSON<{ jobs: any[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${c.boardId}/jobs?content=true`,
    FETCH_OPTS
  );
  
  const postings: RawPosting[] = await Promise.all(
    data.jobs.map(async (j) => {
      let content = j.content ?? "";
      
      // If description content is too short, scrape the public job embed page to get the full description
      const plainTextLen = content.replace(/<[^>]+>/g, "").trim().length;
      if (plainTextLen < 350 && j.id) {
        try {
          const embedUrl = `https://boards.greenhouse.io/embed/job_board/job?id=${j.id}&board=${c.boardId}`;
          const htmlRes = await fetch(embedUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          if (htmlRes.ok) {
            const html = await htmlRes.text();
            const match = html.match(/<div\s+id="content"[^>]*>([\s\S]*?)<\/div>/i);
            if (match && match[1]) {
              content = match[1];
            }
          }
        } catch (err) {
          console.error(`[Scraper] Failed to fetch embed fallback for job ${j.id}:`, err);
        }
      }
      
      return {
        externalId: String(j.id),
        title: j.title,
        location: j.location?.name ?? "Unspecified",
        description: deHtml(content),
        applyUrl: j.absolute_url,
        postedAt: j.updated_at ?? new Date().toISOString(),
      };
    })
  );

  return postings;
}

// Lever: paginated via limit + skip.
// GET https://api.lever.co/v0/postings/<slug>?mode=json&limit=&skip=
async function fetchLever(c: FirmConfig): Promise<RawPosting[]> {
  const limit = 100;
  const all: RawPosting[] = [];
  for (let page = 0, skip = 0; page < 20; page++, skip += limit) {
    const batch = await robustGetJSON<any[]>(
      `https://api.lever.co/v0/postings/${c.boardId}?mode=json&limit=${limit}&skip=${skip}`,
      FETCH_OPTS
    );
    if (!batch.length) break;
    all.push(
      ...batch.map((j) => ({
        externalId: j.id,
        title: j.text,
        location: j.categories?.location ?? "Unspecified",
        description: deHtml(j.descriptionPlain ?? j.description ?? ""),
        applyUrl: j.hostedUrl,
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
      }))
    );
    if (batch.length < limit) break; // last page
  }
  return all;
}

// Ashby: single call.
// GET https://api.ashbyhq.com/posting-api/job-board/<slug>
async function fetchAshby(c: FirmConfig): Promise<RawPosting[]> {
  const data = await robustGetJSON<{ jobs: any[] }>(
    `https://api.ashbyhq.com/posting-api/job-board/${c.boardId}`,
    FETCH_OPTS
  );
  return (data.jobs ?? []).map((j) => ({
    externalId: j.id,
    title: j.title,
    location: j.location ?? "Unspecified",
    description: deHtml(j.descriptionPlain ?? ""),
    applyUrl: j.jobUrl ?? j.applyUrl,
    postedAt: j.publishedAt ?? new Date().toISOString(),
  }));
}

const FETCHERS: Record<AtsSource, (c: FirmConfig) => Promise<RawPosting[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
};

export function fetchPostings(c: FirmConfig): Promise<RawPosting[]> {
  return FETCHERS[c.source](c);
}
