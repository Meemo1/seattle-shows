import { RawEvent } from "../types";

// Ticketmaster venue IDs for Seattle venues
// These can be found by searching https://app.ticketmaster.com/discovery/v2/venues.json?keyword=tractor+tavern&stateCode=WA&apikey=YOUR_KEY
const VENUE_MAP: Record<string, string[]> = {
  // We'll populate these IDs once we have the API key and can look them up
  // Format: "ticketmaster-venue-id": ["our-venue-slug"]
};

// Search by keyword for Seattle area venues
const SEATTLE_VENUE_KEYWORDS = [
  { keyword: "Tractor Tavern", slug: "tractor-tavern" },
  { keyword: "Sunset Tavern", slug: "sunset-tavern" },
  { keyword: "Conor Byrne", slug: "conor-byrne" },
  { keyword: "Crocodile Seattle", slug: "the-crocodile" },
  { keyword: "Neumos", slug: "neumos" },
  { keyword: "Showbox", slug: "the-showbox" },
  { keyword: "Neptune Theatre Seattle", slug: "the-neptune" },
];

interface TmEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  priceRanges?: { min: number; max: number; currency: string }[];
  _embedded?: {
    venues?: { name: string; id: string }[];
    attractions?: { name: string; id: string }[];
  };
}

export async function fetchTicketmaster(): Promise<RawEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.log("Ticketmaster API key not configured, skipping");
    return [];
  }

  const allEvents: RawEvent[] = [];
  const seenEventIds = new Set<string>();

  for (const venue of SEATTLE_VENUE_KEYWORDS) {
    try {
      // Search for events by venue keyword in Washington state
      const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("keyword", venue.keyword);
      url.searchParams.set("stateCode", "WA");
      url.searchParams.set("city", "Seattle");
      url.searchParams.set("size", "50");
      url.searchParams.set("sort", "date,asc");

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.error(`Ticketmaster API error for ${venue.keyword}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const events: TmEvent[] = data._embedded?.events || [];

      for (const event of events) {
        if (seenEventIds.has(event.id)) continue;
        seenEventIds.add(event.id);

        // Determine venue slug from the event's venue name
        const tmVenueName = event._embedded?.venues?.[0]?.name || "";
        const matchedSlug = matchVenueSlug(tmVenueName, venue.slug);

        // Extract artist names
        const artistNames = (event._embedded?.attractions || []).map((a) => a.name);

        // Format price
        let price: string | undefined;
        if (event.priceRanges?.length) {
          const pr = event.priceRanges[0];
          if (pr.min === pr.max) {
            price = `$${pr.min}`;
          } else {
            price = `$${pr.min}-$${pr.max}`;
          }
        }

        allEvents.push({
          title: event.name,
          date: event.dates.start.localDate,
          time: event.dates.start.localTime?.slice(0, 5),
          venueSlug: matchedSlug,
          artistNames: artistNames.length ? artistNames : [event.name],
          price,
          ticketUrl: event.url,
          sourceName: "ticketmaster",
          sourceId: event.id,
          sourceUrl: event.url,
          rawData: event,
        });
      }

      // Small delay between requests to respect rate limits
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.error(`Error fetching Ticketmaster for ${venue.keyword}:`, err);
    }
  }

  return allEvents;
}

function matchVenueSlug(tmVenueName: string, defaultSlug: string): string {
  const name = tmVenueName.toLowerCase();
  if (name.includes("tractor")) return "tractor-tavern";
  if (name.includes("sunset") && name.includes("tavern")) return "sunset-tavern";
  if (name.includes("conor") || name.includes("byrne")) return "conor-byrne";
  if (name.includes("crocodile")) return "the-crocodile";
  if (name.includes("neumos") || name.includes("barboza")) return "neumos";
  if (name.includes("showbox") && name.includes("sodo")) return "showbox-sodo";
  if (name.includes("showbox")) return "the-showbox";
  if (name.includes("neptune")) return "the-neptune";
  return defaultSlug;
}
