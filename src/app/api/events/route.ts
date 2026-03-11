import { NextRequest, NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const events = await getUpcomingEvents({
    venueSlug: params.get("venue") || undefined,
    fromDate: params.get("from") || undefined,
    toDate: params.get("to") || undefined,
    search: params.get("search") || undefined,
  });

  return NextResponse.json(events);
}
