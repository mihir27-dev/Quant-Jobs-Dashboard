import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "", // Use environment variable
});

export async function POST(req: Request) {
  try {
    const { profile, job } = await req.json();

    if (!profile || !job) {
      return NextResponse.json({ error: "Missing profile or job data" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    // Prepare prompt
    const prompt = `You are an expert ATS (Applicant Tracking System) and technical recruiter for quantitative finance roles.

Analyze the following candidate profile and the target job description. Provide a JSON response with the following keys:
- "atsScore": an integer from 0 to 100 representing the estimated ATS match score.
- "matchedKeywords": an array of strings representing key skills or requirements found in BOTH the profile and the job.
- "missingKeywords": an array of strings representing key skills or requirements mentioned in the job but NOT found in the profile.
- "recommendations": an array of strings containing 2-3 brief, actionable tips on how to improve the CV to better match this specific role.

Candidate Profile Summary:
${profile.summary}
Languages: ${profile.languages?.join(", ")}
Skills: ${profile.skills?.join(", ")}
Locations: ${profile.locations?.join(", ")}

Target Job:
Title: ${job.title}
Firm: ${job.firm}
Description:
${job.description || job.snippet}

Respond ONLY with valid JSON and no additional markdown or commentary.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      temperature: 0,
      system: "You are an expert technical recruiter and ATS software analyzer. Only output valid JSON.",
      messages: [{ role: "user", content: prompt }],
    });

    // Parse the JSON from Anthropic's response
    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (e) {
      // In case there's markdown wrapping the JSON
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResult = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse JSON from AI response.");
      }
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error("CV Scanner error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while analyzing the CV." },
      { status: 500 }
    );
  }
}
