// pipeline/normalize.ts
import type { Job, RoleType, WorkMode } from "@/lib/types";
import type { FirmConfig } from "./firms";
import type { RawPosting } from "./sources";

// ── Role classification (most specific first; first match wins) ────────────
const ROLE_RULES: Array<[RegExp, RoleType]> = [
  [/\b(data scien|ml engineer|machine learning eng)/i, "Data Scientist"],
  [/\b(research|scientist|quant analyst)/i, "Researcher"],
  [/\b(trader|trading)\b/i, "Trader"],
  [/\b(developer|engineer|swe|software)/i, "Developer"],
];

export function classifyRole(title: string, desc: string): RoleType | null {
  // First pass: Try to classify strictly based on the job title (highly accurate)
  for (const [re, role] of ROLE_RULES) {
    if (re.test(title)) return role;
  }
  
  // Second pass: Fallback to the description if title is ambiguous
  const hay = `${title} ${desc}`;
  for (const [re, role] of ROLE_RULES) {
    if (re.test(hay)) return role;
  }
  
  return null; // unclassifiable → caller drops it, keeping the board clean
}

// ── Language extraction ────────────────────────────────────────────────────
const LANG_PATTERNS: Array<[RegExp, string]> = [
  [/\bc\+\+\b|\bcpp\b/i, "C++"],
  [/\bpython\b/i, "Python"],
  [/\brust\b/i, "Rust"],
  [/\bocaml\b/i, "OCaml"],
  [/\bjava\b(?!script)/i, "Java"],
  [/\bgo(lang)?\b/i, "Go"],
];

export function extractLanguages(text: string): string[] {
  return LANG_PATTERNS.filter(([re]) => re.test(text)).map(([, name]) => name);
}

// ── Skill / domain extraction ──────────────────────────────────────────────
const SKILL_PATTERNS: Array<[RegExp, string]> = [
  [/statistical arbitrage|stat arb/i, "Statistical Arbitrage"],
  [/machine learning|deep learning|\bml\b/i, "Machine Learning"],
  [/low.?latency|hft|high.?frequency/i, "Low Latency"],
  [/market making/i, "Market Making"],
];

export function extractSkills(text: string): string[] {
  return SKILL_PATTERNS.filter(([re]) => re.test(text)).map(([, n]) => n);
}

// ── Location bucketing ─────────────────────────────────────────────────────
const LOC_RULES: Array<[RegExp, string]> = [
  [/new york|nyc|manhattan|brooklyn|setauket|boston|austin/i, "NYC"],
  [/london/i, "London"],
  [/chicago/i, "Chicago"],
  [/singapore/i, "Singapore"],
  [/hong kong/i, "Hong Kong"],
  [/amsterdam/i, "Amsterdam"],
  [/sydney/i, "Sydney"],
  [/gurugram|gurgaon|gift city|india/i, "Gurugram"],
  [/shanghai/i, "Shanghai"],
  [/montreal|montréal/i, "Montreal"],
  [/remote|anywhere/i, "Remote"],
];

export function bucketLocation(loc: string): string {
  for (const [re, group] of LOC_RULES) if (re.test(loc)) return group;
  return "Other";
}

export function classifyWorkMode(loc: string, desc: string): WorkMode {
  if (/remote/i.test(loc) || /fully remote/i.test(desc)) return "Remote";
  if (/hybrid/i.test(desc)) return "Hybrid";
  return "On-site";
}

function snippetFrom(desc: string, max = 180): string {
  if (desc.length <= max) return desc;
  const cut = desc.lastIndexOf(" ", max);
  return desc.slice(0, cut > 0 ? cut : max).trim() + "…";
}

function cleanUrl(url: string, source: string, boardId: string): string {
  if (!url) return "";
  let u = url.trim();
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) {
    if (source === "greenhouse") {
      return `https://boards.greenhouse.io/${boardId}${u}`;
    }
    if (source === "lever") {
      return `https://jobs.lever.co/${boardId}${u}`;
    }
    if (source === "ashby") {
      return `https://jobs.ashbyhq.com/${boardId}${u}`;
    }
  }
  if (!/^https?:\/\//i.test(u)) {
    return `https://${u}`;
  }
  return u;
}

/** Combine a raw posting with its firm config into the app's Job shape. */
export function assembleJob(raw: RawPosting, firm: FirmConfig): Job | null {
  const role = classifyRole(raw.title, raw.description);
  if (!role) return null; // skip roles that aren't quant trading/research/dev/DS

  // Stale Job Pruning (Phase 3)
  if (raw.postedAt) {
    const postedDate = new Date(raw.postedAt);
    const daysOld = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > 45) return null; // skip stale jobs
  }

  return {
    id: `${firm.source}:${raw.externalId}`,
    firm: firm.name,
    tier: firm.tier, // curated, from the registry — never inferred
    title: raw.title,
    role,
    location: raw.location,
    locationGroup: bucketLocation(raw.location),
    workMode: classifyWorkMode(raw.location, raw.description),
    languages: extractLanguages(raw.description),
    skills: extractSkills(raw.description),
    snippet: snippetFrom(raw.description),
    description: raw.description,
    applyUrl: cleanUrl(raw.applyUrl, firm.source, firm.boardId),
    source: firm.source,
    postedAt: raw.postedAt,
    scrapedAt: new Date().toISOString(),
  };
}
