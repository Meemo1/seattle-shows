import { RawEvent } from "../types";
import { upsertEvent, logFetch, ensureVenue } from "../queries";
import { scrapers } from "./scrapers";
import { fetchTicketmaster } from "./ticketmaster";
import { fetchVenuePilot } from "./venuepilot";

// All API-based fetchers (not scrapers)
const apiFetchers = [
  { name: "ticketmaster", fn: fetchTicketmaster },
  { name: "venuepilot", fn: fetchVenuePilot },
];

// Ensure all needed venues exist in the database
async function ensureVenues() {
  await ensureVenue("fremont-abbey", "Fremont Abbey Arts Center", {
    address: "4272 Fremont Ave N, Seattle, WA 98103",
    neighborhood: "Fremont",
    website: "https://fremontabbey.org",
    vibe: "Intimate concert space, folk, indie, community",
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

  // Run API fetchers sequentially
  for (const fetcher of apiFetchers) {
    try {
      const events = await fetcher.fn();
      const { found, newCount } = await processEvents(events);
      totalFound += found;
      totalNew += newCount;
      results.push({ source: fetcher.name, found, new_events: newCount });
      await logFetch(fetcher.name, "success", found, newCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${fetcher.name} fetch error:`, message);
      results.push({ source: fetcher.name, found: 0, new_events: 0, error: message });
      await logFetch(fetcher.name, "error", 0, 0, message);
    }
  }

  // Run each scraper sequentially
  for (const scraper of scrapers) {
    try {
      const events = await scraper.fn();
      const { found, newCount } = await processEvents(events);
      totalFound += found;
      totalNew += newCount;
      results.push({ source: scraper.name, found, new_events: newCount });
      await logFetch(scraper.name, "success", found, newCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Scraper ${scraper.name} error:`, message);
      results.push({ source: scraper.name, found: 0, new_events: 0, error: message });
      await logFetch(scraper.name, "error", 0, 0, message);
    }
  }

  return { totalFound, totalNew, results };
}

async function processEvents(events: RawEvent[]): Promise<{ found: number; newCount: number }> {
  let newCount = 0;
  for (const event of events) {
    try {
      const result = await upsertEvent(event);
      if (result.isNew) newCount++;
    } catch (err) {
      console.error(`Error upserting event "${event.title}":`, err);
    }
  }
  return { found: events.length, newCount };
}
