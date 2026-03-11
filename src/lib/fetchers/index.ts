import { RawEvent } from "../types";
import { upsertEvent, logFetch, ensureVenue, deduplicateEvents } from "../queries";
import { scrapers } from "./scrapers";
import { fetchTicketmaster } from "./ticketmaster";
import { fetchVenuePilot } from "./venuepilot";
import { fetchDice } from "./dice";
import { enrichArtistGenres } from "./lastfm";

// All API-based fetchers (not scrapers)
const apiFetchers = [
  { name: "ticketmaster", fn: fetchTicketmaster },
  { name: "venuepilot", fn: fetchVenuePilot },
  { name: "dice", fn: fetchDice },
];

// Ensure all needed venues exist in the database
async function ensureVenues() {
  await ensureVenue("fremont-abbey", "Fremont Abbey Arts Center", {
    address: "4272 Fremont Ave N, Seattle, WA 98103",
    neighborhood: "Fremont",
    website: "https://fremontabbey.org",
    vibe: "Intimate concert space, folk, indie, community",
  });
  await ensureVenue("st-marks-cathedral", "St. Mark's Cathedral", {
    address: "1245 10th Ave E, Seattle, WA 98102",
    neighborhood: "Capitol Hill",
    website: "https://saintmarks.org",
    vibe: "Cathedral venue, The Moth, classical, choral",
  });
  await ensureVenue("ballard-homestead", "Ballard Homestead", {
    address: "6541 Jones Ave NW, Seattle, WA 98117",
    neighborhood: "Ballard",
    website: "https://ballardhomestead.org",
    vibe: "Historic community hall, folk, singer-songwriter, intimate",
  });
  await ensureVenue("washington-hall", "Washington Hall", {
    address: "153 14th Ave, Seattle, WA 98122",
    neighborhood: "Central District",
    website: "https://washingtonhall.org",
    vibe: "Historic hall, world music, ecstatic dance, community",
  });
}

export async function runAllFetchers(): Promise<{
  totalFound: number;
  totalNew: number;
  results: { source: string; found: number; new_events: number; error?: string }[];
}> {
  const results: { source: string; found: number; new_events: number; error?: string }[] = [];
  let totalFound = 0;
  let totalNew = 0;

  // Ensure all venue records exist before fetching events
  try {
    await ensureVenues();
  } catch (err) {
    console.error("Error ensuring venues:", err);
  }

  // Clean up any duplicate events left over from title-change fetches
  try {
    const removed = await deduplicateEvents();
    if (removed > 0) console.log(`Deduplication removed ${removed} stale duplicate event(s)`);
  } catch (err) {
    console.error("Error deduplicating events:", err);
  }

  // Run all fetchers and scrapers in parallel to stay within serverless timeout
  const allSources = [
    ...apiFetchers.map((f) => ({ name: f.name, fn: f.fn })),
    ...scrapers.map((s) => ({ name: s.name, fn: s.fn })),
  ];

  const fetchResults = await Promise.allSettled(
    allSources.map(async (source) => {
      const events = await source.fn();
      return { name: source.name, events };
    })
  );

  // Process results sequentially (DB writes need to be sequential for consistency)
  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i];
    const name = allSources[i].name;

    if (result.status === "fulfilled") {
      try {
        const { found, newCount } = await processEvents(result.value.events);
        totalFound += found;
        totalNew += newCount;
        results.push({ source: name, found, new_events: newCount });
        await logFetch(name, "success", found, newCount);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`${name} process error:`, message);
        results.push({ source: name, found: 0, new_events: 0, error: message });
        await logFetch(name, "error", 0, 0, message);
      }
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`${name} fetch error:`, message);
      results.push({ source: name, found: 0, new_events: 0, error: message });
      await logFetch(name, "error", 0, 0, message);
    }
  }

  // Enrich artists that still have no genre via Last.fm (best-effort, 30 per run)
  const lastfmKey = process.env.LASTFM_API_KEY;
  if (lastfmKey) {
    try {
      const enriched = await enrichArtistGenres(lastfmKey);
      if (enriched > 0) console.log(`Last.fm enriched ${enriched} artist genre(s)`);
    } catch (err) {
      console.error("Last.fm enrichment error:", err);
    }
  }

  return { totalFound, totalNew, results };
}

async function processEvents(events: RawEvent[]): Promise<{ found: number; newCount: number }> {
  let newCount = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((event) => upsertEvent(event))
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.isNew) {
        newCount++;
      } else if (result.status === "rejected") {
        console.error("Error upserting event:", result.reason);
      }
    }
  }
  return { found: events.length, newCount };
}
