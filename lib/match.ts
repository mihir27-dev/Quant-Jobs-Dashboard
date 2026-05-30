// lib/match.ts
// Explainable, deterministic match scoring (v1, rule-based).
//
// The research (Resume2Vec, CareerBERT, S-BERT pipelines) shows semantic
// embeddings + cosine similarity beat keyword overlap — that's the planned v2
// (embed the profile + each JD, store vectors, rank by cosine). v1 stays
// dependency-free and fully explainable, which is good enough to rank a
// curated board and lets the UI show *why* something matched.

import type { Job, RoleType, FirmTier } from "./types";

export interface CandidateProfile {
  roles: RoleType[];
  languages: string[];
  skills: string[];
  locations: string[];
  minTier?: FirmTier;
  seniorityYears?: number;
}

export interface MatchResult {
  score: number; // 0–100
  matched: string[]; // drives the badge tooltip ("why this fits")
  missing: string[]; // gaps the candidate could close
}

const WEIGHTS = { role: 35, language: 30, skill: 20, location: 15 };
const TIER_RANK: Record<FirmTier, number> = { SSS: 0, SS: 1, S: 2 };

export function scoreJob(job: Job, p: CandidateProfile): MatchResult {
  const matched: string[] = [];
  const missing: string[] = [];
  let score = 0;

  // Role — wrong role type is rarely a real fit, so it's all-or-nothing.
  if (p.roles.length === 0 || p.roles.includes(job.role)) {
    score += WEIGHTS.role;
    if (p.roles.includes(job.role)) matched.push(`Role: ${job.role}`);
  } else {
    missing.push(`Targets ${job.role}`);
  }

  // Languages — proportional to overlap with stated requirements.
  if (job.languages.length) {
    const have = job.languages.filter((l) => p.languages.includes(l));
    score += WEIGHTS.language * (have.length / job.languages.length);
    have.forEach((l) => matched.push(l));
    job.languages.filter((l) => !p.languages.includes(l)).forEach((l) => missing.push(l));
  } else {
    score += WEIGHTS.language; // no requirement stated → no penalty
  }

  // Domain skills — proportional overlap.
  const jobSkills = job.skills ?? [];
  if (jobSkills.length) {
    const have = jobSkills.filter((s) => p.skills.includes(s));
    score += WEIGHTS.skill * (have.length / jobSkills.length);
    have.forEach((s) => matched.push(s));
  } else {
    score += WEIGHTS.skill;
  }

  // Location preference.
  if (p.locations.length === 0 || p.locations.includes(job.locationGroup)) {
    score += WEIGHTS.location;
    if (p.locations.includes(job.locationGroup)) matched.push(job.locationGroup);
  } else {
    missing.push(`Location: ${job.locationGroup}`);
  }

  // Hard gate: below the candidate's tier floor caps the score.
  if (p.minTier && TIER_RANK[job.tier] > TIER_RANK[p.minTier]) {
    score = Math.min(score, 50);
  }

  return { score: Math.round(score), matched, missing };
}

export function rankJobs(jobs: Job[], p: CandidateProfile): Array<Job & { match: MatchResult }> {
  return jobs
    .map((job) => ({ ...job, match: scoreJob(job, p) }))
    .sort((a, b) => b.match.score - a.match.score);
}
