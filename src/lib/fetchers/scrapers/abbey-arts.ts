import { RawEvent } from "../../types";

// Abbey Arts uses Humanitix for ticketing
// Step 1: Fetch __data.json from the collection page to get all selectedEventIds
// Step 2: Call tRPC events.getEventsFromIds to get full event data for all IDs
const COLLECTION_DATA_URL =
  "https://collections.humanitix.com/all-events-fccb3a/__data.json";
const TRPC_BASE = "https://collections.humanitix.com/trpc";

// Map Humanitix venue names to our venue slugs
const VENUE_MAP: Record<string, string> = {
  "fremont abbey arts center": "fremont-abbey",
  "fremont abbey": "fremont-abbey",
  "ballard homestead": "ballard-homestead",
  "st. mark's cathedral": "st-marks-cathedral",
  "st marks cathedral": "st-marks-cathedral",
  "saint mark's cathedral": "st-marks-cathedral",
  "bloedel hall": "st-marks-cathedral",
  "washington hall": "washington-hall",
};

interface HumanitixEvent {
  id: string;
  slug: string;
  title: string;
  dates: {
    displayDate?: string;
    timeTagDate?: string;
  };
  location: {
    venueName?: string;
    displayLocation?: string;
    address?: string;
  };
  urls: {
    url?: string;
    ticketsUrl?: string;
  };
  moreDatesCount?: number;
}

/**
 * Parse the SvelteKit __data.json dehydrated format to extract selectedEventIds.
 * The format uses indexed arrays where objects reference other items by index.
 */
function extractEventIds(rawJson: string): string[] {
  const firstLine = rawJson.split("\n")[0];
  const data = JSON.parse(firstLine);
  const d = data.nodes?.[1]?.data;
  if (!d || !Array.isArray(d)) return [];

  const root = d[0];
  if (!root || typeof root !== "object") return [];

  // Navigate: root.collection -> collection.events -> events.selectedEventIds
  const coll = d[root.collection];
  if (!coll) return [];

  const eventsConfig = d[coll.events];
  if (!eventsConfig) return [];

  const selectedIdsArray = d[eventsConfig.selectedEventIds];
  if (!Array.isArray(selectedIdsArray)) return [];

  // Each item in selectedIdsArray is an index into d, pointing to an event ID string
  return selectedIdsArray
    .map((idx: number) => d[idx])
    .filter((id: unknown): id is string => typeof id === "string");
}

/**
 * Call the Humanitix tRPC endpoint to get full event data for a list of event IDs.
 */
async function fetchEventsFromIds(
  eventIds: string[]
): Promise<HumanitixEvent[]> {
  const input = JSON.stringify({
    eventIds,
    skip: 0,
    limit: 200,
    stackRecurring: false,
    showPastEvents: false,
    privacyLevel: "public",
    userTimezone: "America/Los_Angeles",
  });

  const url = `${TRPC_BASE}/events.getEventsFromIds?input=${encodeURIComponent(input)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`tRPC getEventsFromIds failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.result?.data?.events || [];
}

export async function scrapeAbbeyArts(): Promise<RawEvent[]> {
  // Step 1: Get all event IDs from the collection __data.json
  const dataResponse = await fetch(COLLECTION_DATA_URL);
  if (!dataResponse.ok) {
    throw new Error(
      `Failed to fetch collection data: ${dataResponse.status}`
    );
  }
  const rawData = await dataResponse.text();
  const eventIds = extractEventIds(rawData);

  if (eventIds.length === 0) {
    console.log("No event IDs found in Abbey Arts collection data");
    return [];
  }

  console.log(`Abbey Arts: found ${eventIds.length} event IDs in collection`);

  // Step 2: Fetch full event data via tRPC
  const hxEvents = await fetchEventsFromIds(eventIds);
  console.log(
    `Abbey Arts: tRPC returned ${hxEvents.length} events`
  );

  const events: RawEvent[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const event of hxEvents) {
    // Parse date from timeTagDate (e.g. "2026-04-07T19:30:00-0700")
    const startDate = event.dates?.timeTagDate || "";
    const dateMatch = startDate.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const timeStr = dateMatch[2];

    // Skip past events
    if (dateStr < today) continue;

    // Determine venue from location
    const venueName = event.location?.venueName || "";
    const locationLower = venueName.toLowerCase();
    let venueSlug: string | undefined;
    for (const [key, slug] of Object.entries(VENUE_MAP)) {
      if (locationLower.includes(key)) {
        venueSlug = slug;
        break;
      }
    }

    // Skip events not at our tracked venues
    if (!venueSlug) continue;

    // Skip recurring multi-week events (classes, workshops, etc.)
    const titleLower = event.title.toLowerCase();
    if (
      titleLower.includes("class") ||
      titleLower.includes("workshop") ||
      titleLower.includes("workspace") ||
      titleLower.includes("volunteer")
    ) {
      continue;
    }

    // Clean up title — remove venue suffix and date prefix
    let title = event.title
      .replace(
        /\s*@\s*(FREMONT ABBEY|BALLARD HOMESTEAD|ST\.?\s*MARK'?S?|BLOEDEL HALL|WASHINGTON HALL|THE PALINDROME).*/i,
        ""
      )
      .replace(/\s*-\s*Abbey Arts Presents.*/i, "")
      .replace(/^\d+\/\d+\s*/, "") // Remove date prefix like "3/27 "
      .trim();

    // Extract artist names
    const artistNames = title
      .split(/\s*[-–—]\s*/)[0]
      .split(/\s*[,&+]\s*/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const ticketUrl = event.urls?.url?.split("?")[0] || undefined;

    events.push({
      title,
      date: dateStr,
      time: timeStr || undefined,
      venueSlug,
      artistNames: artistNames.length ? artistNames : [title],
      ticketUrl,
      sourceName: "scraper:abbey-arts",
      sourceId: event.id,
      sourceUrl: ticketUrl,
    });
  }

  return events;
}
