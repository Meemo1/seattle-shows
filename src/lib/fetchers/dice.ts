import { RawEvent } from "../types";

// DICE API — used by Sunset Tavern and potentially other venues
const DICE_API = "https://partners-endpoint.dice.fm/api/v2/events";

interface DiceEvent {
  id: string;
  name: string;
  date: string; // ISO 8601 UTC
  date_end?: string;
  timezone: string;
  venue: string;
  address: string;
  description?: string;
  raw_description?: string;
  artists: string[];
  detailed_artists?: Array<{ name: string; headliner?: boolean }>;
  lineup?: Array<{ details: string; time: string }>;
  price: number; // cents
  currency: string;
  ticket_types?: Array<{
    name: string;
    price: { total: number; face_value: number; fees: number };
    sold_out: boolean;
  }>;
  sold_out: boolean;
  status: string;
  age_limit?: string;
  url: string;
  perm_name: string;
  event_images?: Record<string, string>;
  external_url?: string | null;
}

interface DiceVenueConfig {
  promoterFilter: string;
  apiKey: string;
  venueSlug: string;
  venueName: string;
}

const DICE_VENUES: DiceVenueConfig[] = [
  {
    promoterFilter: "Bars We Like, Inc dba Sunset Tavern",
    apiKey: "uZgJttkg0G75xfWU7xCDI7nOQO9xhwAH4mC9xjr3",
    venueSlug: "sunset-tavern",
    venueName: "Sunset Tavern",
  },
];

export async function fetchDice(): Promise<RawEvent[]> {
  const allEvents: RawEvent[] = [];

  for (const venue of DICE_VENUES) {
    try {
      const url = new URL(DICE_API);
      url.searchParams.set("page[size]", "100");
      url.searchParams.set("types", "linkout,event");
      url.searchParams.set("filter[promoters][]", venue.promoterFilter);

      const response = await fetch(url.toString(), {
        headers: { "x-api-key": venue.apiKey },
      });

      if (!response.ok) {
        console.error(`DICE API error for ${venue.venueName}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const events: DiceEvent[] = data.data || [];

      for (const event of events) {
        // Convert UTC date to local date in venue timezone
        const startUtc = new Date(event.date);
        const dateStr = utcToLocalDate(startUtc, event.timezone);
        const timeStr = utcToLocalTime(startUtc, event.timezone);

        // Extract door time from lineup
        let doorsTime: string | undefined;
        if (event.lineup?.length) {
          const doorsEntry = event.lineup.find((l) =>
            l.details.toLowerCase().includes("doors")
          );
          if (doorsEntry) {
            doorsTime = parseTime12h(doorsEntry.time);
          }
        }

        // Format price from cents
        let price: string | undefined;
        if (event.ticket_types?.length) {
          const prices = event.ticket_types
            .filter((t) => !t.sold_out)
            .map((t) => t.price.total);
          if (prices.length > 0) {
            const min = Math.min(...prices) / 100;
            const max = Math.max(...prices) / 100;
            if (min === max) {
              price = `$${min.toFixed(2)}`;
            } else {
              price = `$${min.toFixed(2)}-$${max.toFixed(2)}`;
            }
          }
        } else if (event.price > 0) {
          price = `$${(event.price / 100).toFixed(2)}`;
        }

        // Artist names
        const artistNames = event.artists?.length
          ? event.artists
          : event.detailed_artists?.map((a) => a.name) || [event.name];

        // Skip sold out shows? No — still show them but could flag later

        allEvents.push({
          title: event.name,
          date: dateStr,
          time: timeStr,
          doorsTime,
          venueSlug: venue.venueSlug,
          artistNames,
          price,
          ticketUrl: event.url || undefined,
          description: event.raw_description || event.description || undefined,
          sourceName: "dice",
          sourceId: event.id,
          sourceUrl: event.url || undefined,
        });
      }
    } catch (err) {
      console.error(`Error fetching DICE for ${venue.venueName}:`, err);
    }
  }

  return allEvents;
}

function utcToLocalDate(utc: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(utc);
    return parts; // en-CA gives YYYY-MM-DD
  } catch {
    return utc.toISOString().split("T")[0];
  }
}

function utcToLocalTime(utc: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(utc);
    return parts;
  } catch {
    return utc.toISOString().slice(11, 16);
  }
}

function parseTime12h(timeStr: string): string | undefined {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return undefined;
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}
