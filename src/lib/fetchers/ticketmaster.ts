import { RawEvent } from "../types";

// Ticketmaster venue IDs mapped to our venue slugs
// Found via: https://app.ticketmaster.com/discovery/v2/venues.json?keyword=NAME&stateCode=WA&apikey=KEY
const VENUES = [
  { tmId: "KovZpZAdnvnA", slug: "tractor-tavern", name: "Tractor Tavern" },
  { tmId: "KovZpap2ne", slug: "sunset-tavern", name: "Sunset Tavern" },
  { tmId: "KovZpZA1kdIA", slug: "conor-byrne", name: "Conor Byrne Pub" },
  { tmId: "KovZpZA1vFtA", slug: "the-crocodile", name: "The Crocodile" },
  { tmId: "KovZpappxe", slug: "neumos", name: "Neumos" },
  { tmId: "KovZpZAEknlA", slug: "the-showbox", name: "Showbox" },
  { tmId: "KovZpa6Mee", slug: "showbox-sodo", name: "Showbox SoDo" },
  { tmId: "KovZpZAFnltA", slug: "the-neptune", name: "Neptune Theatre" },
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
    status?: {
      code?: string;
    };
  };
  priceRanges?: { min: number; max: number; currency: string }[];
  classifications?: Array<{
    genre?: { id: string; name: string };
    subGenre?: { id: string; name: string };
  }>;
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

  for (const venue of VENUES) {
    try {
      // Query by venue ID — much more accurate than keyword search
      let page = 0;
      let totalPages = 1;

      while (page < totalPages && page < 5) {
        const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
        url.searchParams.set("apikey", apiKey);
        url.searchParams.set("venueId", venue.tmId);
        url.searchParams.set("size", "100");
        url.searchParams.set("page", String(page));
        url.searchParams.set("sort", "date,asc");

        const response = await fetch(url.toString());
        if (!response.ok) {
          console.error(`Ticketmaster API error for ${venue.name}: ${response.status}`);
          break;
        }

        const data = await response.json();
        totalPages = data.page?.totalPages || 1;
        const events: TmEvent[] = data._embedded?.events || [];

        for (const event of events) {
          if (seenEventIds.has(event.id)) continue;
          seenEventIds.add(event.id);

          // Skip cancelled events
          if (event.dates.status?.code === "cancelled") continue;

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

          // Extract genre: prefer subGenre (more specific), fall back to genre
          // Skip Ticketmaster's placeholder value "Undefined"
          const classification = event.classifications?.[0];
          const rawGenre =
            classification?.subGenre?.name ||
            classification?.genre?.name ||
            undefined;
          // "Undefined" and "Other" are Ticketmaster placeholders — skip them
          const TM_JUNK_GENRES = new Set(["Undefined", "Other"]);
          const genre =
            rawGenre && !TM_JUNK_GENRES.has(rawGenre) ? rawGenre : undefined;

          allEvents.push({
            title: event.name,
            date: event.dates.start.localDate,
            time: event.dates.start.localTime?.slice(0, 5),
            venueSlug: venue.slug,
            artistNames: artistNames.length ? artistNames : [event.name],
            genre,
            price,
            ticketUrl: event.url,
            sourceName: "ticketmaster",
            sourceId: event.id,
            sourceUrl: event.url,
            rawData: event,
          });
        }

        page++;
        // Small delay between requests to respect rate limits
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (err) {
      console.error(`Error fetching Ticketmaster for ${venue.name}:`, err);
    }
  }

  return allEvents;
}
