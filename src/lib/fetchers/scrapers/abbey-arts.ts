import * as cheerio from "cheerio";
import { RawEvent } from "../../types";

// Abbey Arts uses Humanitix for ticketing
// Their collection page includes events at Fremont Abbey, Ballard Homestead, and other venues
const COLLECTION_URL =
  "https://collections.humanitix.com/all-events-fccb3a";

// Humanitix host page — may have events not on the collection page
const HOST_URL = "https://events.humanitix.com/host/abbey-arts-presents";

// Map Humanitix venue names to our venue slugs
const VENUE_MAP: Record<string, string> = {
  "fremont abbey arts center": "fremont-abbey",
  "fremont abbey": "fremont-abbey",
  "ballard homestead": "ballard-homestead",
  "st. mark's cathedral": "st-marks-cathedral",
  "st marks cathedral": "st-marks-cathedral",
  "bloedel hall": "st-marks-cathedral",
};

interface JsonLdEvent {
  "@type": string;
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  location?: {
    "@type": string;
    name?: string;
    url?: string;
    address?: {
      streetAddress?: string;
    };
  };
  description?: string;
  image?: string;
  eventStatus?: string;
  eventAttendanceMode?: string;
  offers?: Array<{
    name?: string;
    price?: number;
    priceCurrency?: string;
  }>;
}

async function fetchJsonLdEvents(url: string): Promise<JsonLdEvent[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const html = await response.text();
    const $ = cheerio.load(html);

    // Try ItemList format (collection page)
    for (const el of $('script[type="application/ld+json"]').toArray()) {
      try {
        const data = JSON.parse($(el).html() || "{}");
        if (data.itemListElement) {
          return data.itemListElement
            .map((item: { item?: JsonLdEvent }) => item.item)
            .filter((e: JsonLdEvent | undefined) => e && e["@type"] === "Event");
        }
        // Try direct Event or array of Events (host page)
        if (data["@type"] === "Event") return [data];
        if (Array.isArray(data)) return data.filter((e: JsonLdEvent) => e["@type"] === "Event");
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error(`Failed to fetch JSON-LD from ${url}:`, err);
  }
  return [];
}

export async function scrapeAbbeyArts(): Promise<RawEvent[]> {
  // Fetch from both collection page and host page for best coverage
  const [collectionEvents, hostEvents] = await Promise.all([
    fetchJsonLdEvents(COLLECTION_URL),
    fetchJsonLdEvents(HOST_URL),
  ]);

  // Merge and deduplicate by event URL
  const seenUrls = new Set<string>();
  const allJsonLdEvents: JsonLdEvent[] = [];
  for (const event of [...collectionEvents, ...hostEvents]) {
    const url = event.url || "";
    if (url && seenUrls.has(url)) continue;
    if (url) seenUrls.add(url);
    allJsonLdEvents.push(event);
  }

  const events: RawEvent[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const event of allJsonLdEvents) {

    // Skip cancelled events
    if (event.eventStatus?.includes("Cancelled")) continue;

    // Skip online-only events (workshops, classes)
    if (
      event.eventAttendanceMode?.includes("OnlineEventAttendanceMode") &&
      !event.eventAttendanceMode?.includes("Mixed")
    ) {
      continue;
    }

    // Determine venue from location
    const locationName = event.location?.name?.toLowerCase() || "";
    let venueSlug: string | undefined;
    for (const [key, slug] of Object.entries(VENUE_MAP)) {
      if (locationName.includes(key)) {
        venueSlug = slug;
        break;
      }
    }

    // Skip events not at our tracked venues
    if (!venueSlug) continue;

    // Parse date and time from ISO 8601 startDate
    // Format: "2026-03-14T19:30:00-0700"
    const startDate = event.startDate || "";
    const dateMatch = startDate.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const timeStr = dateMatch[2];

    // Skip past events
    if (dateStr < today) continue;

    // Skip recurring multi-week events (classes, workshops)
    const nameLower = event.name.toLowerCase();
    if (
      nameLower.includes("class") ||
      nameLower.includes("workshop") ||
      nameLower.includes("workspace") ||
      nameLower.includes("volunteer")
    ) {
      continue;
    }

    // Format price from offers
    let price: string | undefined;
    const offers = event.offers || [];
    const paidOffers = offers.filter((o) => o.price && o.price > 0);
    if (paidOffers.length > 0) {
      const prices = paidOffers.map((o) => o.price!);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) {
        price = `$${min}`;
      } else {
        price = `$${min}-$${max}`;
      }
    } else if (offers.some((o) => o.name?.toLowerCase().includes("free") || o.price === 0)) {
      price = "Free / Donation";
    }

    // Clean up title — remove venue suffix if present
    let title = event.name
      .replace(/\s*@\s*(Fremont Abbey|Ballard Homestead|St\.?\s*Mark'?s?\s*Cathedral|Bloedel Hall).*/i, "")
      .replace(/\s*-\s*Abbey Arts Presents.*/i, "")
      .trim();

    // Extract artist name (usually the first part before " - " or " @ " or " with ")
    const artistNames = title
      .split(/\s*[-–—]\s*/)[0]
      .split(/\s*[,&+]\s*/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    events.push({
      title,
      date: dateStr,
      time: timeStr || undefined,
      venueSlug,
      artistNames: artistNames.length ? artistNames : [title],
      price,
      ticketUrl: event.url || undefined,
      description: event.description?.replace(/<[^>]*>/g, "").trim(),
      sourceName: "scraper:abbey-arts",
      sourceUrl: event.url || undefined,
    });
  }

  return events;
}
