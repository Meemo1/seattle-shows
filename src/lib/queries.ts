import sql from "./db";
import { EventWithVenue, RawEvent } from "./types";
import { slugify } from "./utils";

export async function getUpcomingEvents(filters?: {
  venueSlug?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}): Promise<EventWithVenue[]> {
  // For the common case (no filters), use a simple tagged template
  if (!filters?.venueSlug && !filters?.fromDate && !filters?.toDate && !filters?.search) {
    const rows = await sql`
      SELECT e.id, e.venue_id, e.title, e.date::text, e.time::text, e.doors_time::text,
             e.price, e.ticket_url, e.description, e.cancelled,
             v.name as venue_name, v.slug as venue_slug, v.neighborhood
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      WHERE e.date >= CURRENT_DATE AND e.cancelled = false
      ORDER BY e.date ASC, e.time ASC NULLS LAST
      LIMIT 200
    `;
    return rows as EventWithVenue[];
  }

  // With venue filter
  if (filters?.venueSlug && !filters?.search) {
    const rows = await sql`
      SELECT e.id, e.venue_id, e.title, e.date::text, e.time::text, e.doors_time::text,
             e.price, e.ticket_url, e.description, e.cancelled,
             v.name as venue_name, v.slug as venue_slug, v.neighborhood
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      WHERE e.date >= CURRENT_DATE AND e.cancelled = false
        AND v.slug = ${filters.venueSlug}
      ORDER BY e.date ASC, e.time ASC NULLS LAST
      LIMIT 200
    `;
    return rows as EventWithVenue[];
  }

  // With search filter
  if (filters?.search && !filters?.venueSlug) {
    const searchPattern = `%${filters.search}%`;
    const rows = await sql`
      SELECT e.id, e.venue_id, e.title, e.date::text, e.time::text, e.doors_time::text,
             e.price, e.ticket_url, e.description, e.cancelled,
             v.name as venue_name, v.slug as venue_slug, v.neighborhood
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      WHERE e.date >= CURRENT_DATE AND e.cancelled = false
        AND (e.title ILIKE ${searchPattern} OR v.name ILIKE ${searchPattern})
      ORDER BY e.date ASC, e.time ASC NULLS LAST
      LIMIT 200
    `;
    return rows as EventWithVenue[];
  }

  // With both venue and search filters
  const searchPattern = `%${filters?.search || ""}%`;
  const rows = await sql`
    SELECT e.id, e.venue_id, e.title, e.date::text, e.time::text, e.doors_time::text,
           e.price, e.ticket_url, e.description, e.cancelled,
           v.name as venue_name, v.slug as venue_slug, v.neighborhood
    FROM events e
    JOIN venues v ON e.venue_id = v.id
    WHERE e.date >= CURRENT_DATE AND e.cancelled = false
      AND v.slug = ${filters?.venueSlug || ""}
      AND (e.title ILIKE ${searchPattern} OR v.name ILIKE ${searchPattern})
    ORDER BY e.date ASC, e.time ASC NULLS LAST
    LIMIT 200
  `;
  return rows as EventWithVenue[];
}

export async function upsertEvent(raw: RawEvent): Promise<{ eventId: string; isNew: boolean }> {
  // Find the venue
  const venues = await sql`SELECT id FROM venues WHERE slug = ${raw.venueSlug}`;
  if (venues.length === 0) {
    throw new Error(`Venue not found: ${raw.venueSlug}`);
  }
  const venueId = venues[0].id;

  const timeVal = raw.time || null;
  const doorsVal = raw.doorsTime || null;
  const priceVal = raw.price || null;
  const ticketVal = raw.ticketUrl || null;
  const descVal = raw.description || null;

  // Upsert the event
  const result = await sql`
    INSERT INTO events (venue_id, title, date, time, doors_time, price, ticket_url, description)
    VALUES (${venueId}, ${raw.title}, ${raw.date}, ${timeVal}, ${doorsVal}, ${priceVal}, ${ticketVal}, ${descVal})
    ON CONFLICT (venue_id, date, title) DO UPDATE SET
      time = COALESCE(events.time, EXCLUDED.time),
      doors_time = COALESCE(events.doors_time, EXCLUDED.doors_time),
      price = COALESCE(events.price, EXCLUDED.price),
      ticket_url = COALESCE(events.ticket_url, EXCLUDED.ticket_url),
      description = COALESCE(events.description, EXCLUDED.description),
      updated_at = now()
    RETURNING id, (xmax = 0) as is_new
  `;

  const eventId = result[0].id;
  const isNew = result[0].is_new;

  // Record the source
  const sourceId = raw.sourceId || null;
  const sourceUrl = raw.sourceUrl || null;
  const rawDataJson = JSON.stringify(raw.rawData || null);

  await sql`
    INSERT INTO event_sources (event_id, source_name, external_id, source_url, raw_data)
    VALUES (${eventId}, ${raw.sourceName}, ${sourceId}, ${sourceUrl}, ${rawDataJson}::jsonb)
    ON CONFLICT (event_id, source_name) DO UPDATE SET
      fetched_at = now(),
      raw_data = EXCLUDED.raw_data
  `;

  // Link artists
  for (const artistName of raw.artistNames) {
    const artistSlug = slugify(artistName);
    if (!artistSlug) continue;

    const trimmedName = artistName.trim();
    await sql`
      INSERT INTO artists (name, slug) VALUES (${trimmedName}, ${artistSlug})
      ON CONFLICT (slug) DO NOTHING
    `;

    const artists = await sql`SELECT id FROM artists WHERE slug = ${artistSlug}`;
    if (artists.length > 0) {
      await sql`
        INSERT INTO event_artists (event_id, artist_id) VALUES (${eventId}, ${artists[0].id})
        ON CONFLICT (event_id, artist_id) DO NOTHING
      `;
    }
  }

  return { eventId, isNew };
}

export async function getVenues(): Promise<
  { id: string; name: string; slug: string; neighborhood: string | null; vibe: string | null; event_count: number }[]
> {
  const rows = await sql`
    SELECT v.id, v.name, v.slug, v.neighborhood, v.vibe,
           COUNT(e.id) FILTER (WHERE e.date >= CURRENT_DATE AND e.cancelled = false) as event_count
    FROM venues v
    LEFT JOIN events e ON e.venue_id = v.id
    WHERE v.active = true
    GROUP BY v.id
    ORDER BY v.name
  `;
  return rows as { id: string; name: string; slug: string; neighborhood: string | null; vibe: string | null; event_count: number }[];
}

export async function getVenueBySlug(slug: string) {
  const rows = await sql`SELECT * FROM venues WHERE slug = ${slug}`;
  return rows[0] || null;
}

export async function ensureVenue(
  slug: string,
  name: string,
  opts?: { address?: string; neighborhood?: string; website?: string; vibe?: string }
): Promise<void> {
  const address = opts?.address || null;
  const neighborhood = opts?.neighborhood || null;
  const website = opts?.website || null;
  const vibe = opts?.vibe || null;
  await sql`
    INSERT INTO venues (name, slug, address, neighborhood, website, vibe)
    VALUES (${name}, ${slug}, ${address}, ${neighborhood}, ${website}, ${vibe})
    ON CONFLICT (slug) DO NOTHING
  `;
}

export async function logFetch(
  sourceName: string,
  status: "success" | "error" | "partial",
  eventsFound: number,
  eventsNew: number,
  errorMessage?: string
) {
  const errMsg = errorMessage || null;
  await sql`
    INSERT INTO fetch_log (source_name, status, events_found, events_new, error_message, finished_at)
    VALUES (${sourceName}, ${status}, ${eventsFound}, ${eventsNew}, ${errMsg}, now())
  `;
}
