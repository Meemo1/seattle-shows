import { NextRequest, NextResponse } from "next/server";
import { runAllFetchers } from "@/lib/fetchers";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const urlSecret = request.nextUrl.searchParams.get("token");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runAllFetchers();
    return NextResponse.json({
      ok: true,
      ...results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
