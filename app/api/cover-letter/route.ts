// app/api/cover-letter/route.ts
// Server-side route for the Apply Assistant. The API key stays on the server
// (never in the browser). Calls Claude via the official SDK.
// Docs: https://docs.claude.com/en/api/overview
import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client (reads ANTHROPIC_API_KEY from environment)
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "mock-key-if-not-set",
});

export async function POST(req: Request) {
  try {
    const { job, profile } = await req.json();

    const prompt = `Write a concise, specific cover letter (about 150 words) for a quantitative finance application. Be concrete and confident, avoid clichés and generic filler, and reference the actual requirements.

Role: ${job.title} at ${job.firm} (${job.location})
Key requirements: ${job.snippet}
Languages: ${(job.languages ?? []).join(", ")}
Domain skills sought: ${(job.skills ?? []).join(", ") || "n/a"}

Candidate: ${profile.fullName}. ${profile.summary} Known languages: ${(profile.languages ?? []).join(", ")}. Skills: ${(profile.skills ?? []).join(", ")}.

Return only the cover letter body, no preamble or sign-off placeholders.`;

    // Handle mock mode if no api key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("ANTHROPIC_API_KEY is not set. Returning a mock cover letter.");
      const mockLetter = `Dear hiring team at ${job.firm},\n\nI am writing to express my strong interest in the ${job.title} position. With my background in MS in Statistics and experience building systematic equity signals, I am confident in my ability to contribute to your team.\n\nMy proficiency in ${profile.languages.join(", ")} aligns directly with your requirements. I look forward to discussing how my skills in ${profile.skills.join(", ")} can support your goals.\n\nBest regards,\n${profile.fullName}`;
      return Response.json({ text: mockLetter });
    }

    const msg = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();

    return Response.json({ text });
  } catch (err) {
    console.error("cover-letter error:", err);
    return Response.json({ error: "generation failed" }, { status: 500 });
  }
}
