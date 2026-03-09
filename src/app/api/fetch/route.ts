import { NextRequest, NextResponse } from "next/server";
import { runAllFetchers } from "@/lib/fetchers";

export async function POST(request: NextRequest) {
  // Simple secret check for admin actions
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runAllFetchers();
  return NextResponse.json({ ok: true, ...results });
}
