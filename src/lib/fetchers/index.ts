import { RawEvent } from "../types";
import { upsertEvent, logFetch } from "../queries";
import { scrapers } from "./scrapers";
import { fetchTicketmaster } from "./ticketmaster";

export async function runAllFetchers(): Promise<{
  totalFound: number;
  totalNew: number;
  results: { source: string; found: number; new_events: number; error?: string }[];
}> {
  const results: { source: string; found: number; new_events: number; error?: string }[] = [];
  let totalFound = 0;
  let totalNew = 0;

  // Run Ticketmaster API fetcher
  try {
    const events = await fetchTicketmaster();
    const { found, newCount } = await processEvents(events);
    totalFound += found;
    totalNew += newCount;
    results.push({ source: "ticketmaster", found, new_events: newCount });
    await logFetch("ticketmaster", "success", found, newCount);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Ticketmaster fetch error:", message);
    results.push({ source: "ticketmaster", found: 0, new_events: 0, error: message });
    await logFetch("ticketmaster", "error", 0, 0, message);
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
