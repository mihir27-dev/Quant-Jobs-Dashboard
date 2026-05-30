// pipeline/schema.ts
// Runtime validation at the ingest boundary. Source APIs change without
// notice; validating here means bad data fails loudly in the pipeline
// instead of silently corrupting the feed the frontend renders.
import { z } from "zod";

export const JobSchema = z.object({
  id: z.string().min(1),
  firm: z.string().min(1),
  tier: z.enum(["SSS", "SS", "S"]),
  title: z.string().min(1),
  role: z.enum(["Researcher", "Trader", "Developer", "Data Scientist"]),
  location: z.string(),
  locationGroup: z.string(),
  workMode: z.enum(["On-site", "Hybrid", "Remote"]),
  languages: z.array(z.string()),
  skills: z.array(z.string()).optional(),
  compRange: z.string().optional(),
  snippet: z.string(),
  description: z.string().optional(),
  applyUrl: z.string().url(),
  source: z.enum(["greenhouse", "lever", "ashby", "custom"]),
  postedAt: z.string(),
  scrapedAt: z.string(),
});

export type ValidatedJob = z.infer<typeof JobSchema>;

/** Partition a batch into valid jobs + structured errors. Never throws. */
export function validateJobs(jobs: unknown[]): {
  valid: ValidatedJob[];
  invalid: Array<{ index: number; issues: string[] }>;
} {
  const valid: ValidatedJob[] = [];
  const invalid: Array<{ index: number; issues: string[] }> = [];
  jobs.forEach((j, index) => {
    const r = JobSchema.safeParse(j);
    if (r.success) valid.push(r.data);
    else invalid.push({ index, issues: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  });
  return { valid, invalid };
}
