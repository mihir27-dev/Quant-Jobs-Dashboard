import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Ensure the request comes from Vercel Cron or contains a valid auth token
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // In a real scenario, this would query the DB for new jobs in the last 24h
    // and match against the user's saved CV/profile.
    
    // 1. Fetch new jobs
    const newJobs = [
      { title: "Quantitative Researcher", firm: "Jane Street", location: "New York" },
      { title: "C++ Low Latency Engineer", firm: "Optiver", location: "Chicago" }
    ];

    // 2. Format email body
    const emailHtml = `
      <h2>Your Daily Quant Jobs Digest</h2>
      <p>We found ${newJobs.length} new roles matching your profile.</p>
      <ul>
        ${newJobs.map(j => `<li><strong>${j.title}</strong> at ${j.firm} (${j.location})</li>`).join('')}
      </ul>
      <a href="https://quantboard.com">View Dashboard</a>
    `;

    // 3. Send email via Resend or Nodemailer
    // Mocking email sending
    console.log("[CRON DIGEST] Sending email...");
    console.log(emailHtml);

    return NextResponse.json({ success: true, sentCount: newJobs.length });
  } catch (err: any) {
    console.error("[CRON DIGEST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
