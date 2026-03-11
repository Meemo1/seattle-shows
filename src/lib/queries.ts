import sql from "./db";
import { EventWithVenue, RawEvent } from "./types";
import { slugify } from "./utils";

export async function getUpcomingEvents(filters?: {
  venueSlug?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}): Promise<EventWithVenue[]> {
  // Correlated subquery: first non-null genre from linked artists
  // Used in all query variants below
  const genreSubquery = sql`(
    SELECT a.genre FROM artists a
    JOIN event_artists ea ON ea.artist_id = a.id
    WHERE ea.event_id = e.id AND a.genre IS NOT NULL
    LIMIT 1
  ) as genre`;

  // For the common case (no filters), use a simple tagged template
  if (!filters?.venueSlug && !filters?.fromDate && !filters?.toDate && !filters?.search) {
    const rows = await sql`
      SELECT e.id, e.venue_id, e.title, e.date::text, e.time::text, e.doors_time::text,
             e.price, e.ticket_url, e.description, e.cancelled,
             v.name as venue_name, v.slug as venue_slug, v.neighborhood,
             ${genreSubquery}
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
             v.name as venue_name, v.slug as venue_slug, v.neighborhood,
             ${genreSubquery}
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
             v.name as venue_name, v.slug as venue_slug, v.neighborhood,
             ${genreSubquery}
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
           v.name as venue_name, v.slug as venue_slug, v.neighborhood,
           ${genreSubquery}
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

// Cache venue IDs to avoid repeated lookups
const venueIdCache = new Map<string, string>();

async function getVenueId(slug: string): Promise<string | null> {
  if (venueIdCache.has(slug)) return venueIdCache.get(slug)!;
  const venues = await sql`SELECT id FROM venues WHERE slug = ${slug}`;
  if (venues.length === 0) return null;
  venueIdCache.set(slug, venues[0].id);
  return venues[0].id;
}

export async function upsertEvent(raw: RawEvent): Promise<{ eventId: string; isNew: boolean }> {
  const venueId = await getVenueId(raw.venueSlug);
  if (!venueId) {
    throw new Error(`Venue not found: ${raw.venueSlug}`);
  }

  const timeVal = raw.time || null;
  const doorsVal = raw.doorsTime || null;
  const priceVal = raw.price || null;
  const ticketVal = raw.ticketUrl || null;
  const descVal = raw.description || null;
  const sourceId = raw.sourceId || null;
  const sourceUrl = raw.sourceUrl || null;
  const rawDataJson = JSON.stringify(raw.rawData || null);

  // Step 1: If we have an external ID, check whether this source already tracks this event.
  // This prevents duplicates when a source changes its event title between fetches
  // (e.g. Ticketmaster appends "(Sold Out)" or "(Rescheduled)").
  if (sourceId) {
    const existing = await sql`
      SELECT event_id FROM event_sources
      WHERE source_name = ${raw.sourceName} AND external_id = ${sourceId}
      LIMIT 1
    `;
    if (existing.length > 0) {
      const eventId = existing[0].event_id as string;
      // Update the event in place — the title may have changed
      await sql`
        UPDATE events SET
          title       = ${raw.title},
          time        = COALESCE(${timeVal}, time),
          doors_time  = COALESCE(${doorsVal}, doors_time),
          price       = COALESCE(${priceVal}, price),
          ticket_url  = COALESCE(${ticketVal}, ticket_url),
          description = COALESCE(${descVal}, description),
          updated_at  = now()
        WHERE id = ${eventId}
      `;
      await sql`
        UPDATE event_sources SET
          fetched_at = now(),
          source_url = COALESCE(${sourceUrl}, source_url),
          raw_data   = ${rawDataJson}::jsonb
        WHERE event_id = ${eventId} AND source_name = ${raw.sourceName}
      `;
      // Also update genre for linked artists if this source provides one
      if (raw.genre) {
        const genre = raw.genre;
        await sql`
          UPDATE artists SET genre = ${genre}
          WHERE id IN (
            SELECT artist_id FROM event_artists WHERE event_id = ${eventId}
          ) AND genre IS NULL
        `;
      }
      return { eventId, isNew: false };
    }
  }

  // Step 2: No existing source record — insert/upsert by (venue_id, date, title)
  const result = await sql`
    WITH evt AS (
      INSERT INTO events (venue_id, title, date, time, doors_time, price, ticket_url, description)
      VALUES (${venueId}, ${raw.title}, ${raw.date}, ${timeVal}, ${doorsVal}, ${priceVal}, ${ticketVal}, ${descVal})
      ON CONFLICT (venue_id, date, title) DO UPDATE SET
        time        = COALESCE(events.time, EXCLUDED.time),
        doors_time  = COALESCE(events.doors_time, EXCLUDED.doors_time),
        price       = COALESCE(events.price, EXCLUDED.price),
        ticket_url  = COALESCE(events.ticket_url, EXCLUDED.ticket_url),
        description = COALESCE(events.description, EXCLUDED.description),
        updated_at  = now()
      RETURNING id, (xmax = 0) as is_new
    ), src AS (
      INSERT INTO event_sources (event_id, source_name, external_id, source_url, raw_data)
      SELECT id, ${raw.sourceName}, ${sourceId}, ${sourceUrl}, ${rawDataJson}::jsonb FROM evt
      ON CONFLICT (event_id, source_name) DO UPDATE SET
        fetched_at = now(),
        raw_data   = EXCLUDED.raw_data
    )
    SELECT id, is_new FROM evt
  `;

  const eventId = result[0].id as string;
  const isNew = result[0].is_new as boolean;

  // Link artists and save genre if provided (only fills NULL — never overwrites richer data)
  const genre = raw.genre || null;
  for (const artistName of raw.artistNames) {
    const artistSlug = slugify(artistName);
    if (!artistSlug) continue;
    const trimmedName = artistName.trim();
    await sql`
      WITH art AS (
        INSERT INTO artists (name, slug) VALUES (${trimmedName}, ${artistSlug})
        ON CONFLICT (slug) DO UPDATE SET name = artists.name
        RETURNING id
      ),
      genre_update AS (
        UPDATE artists SET genre = ${genre}
        WHERE slug = ${artistSlug} AND genre IS NULL AND ${genre} IS NOT NULL
      )
      INSERT INTO event_artists (event_id, artist_id)
      SELECT ${eventId}, id FROM art
      ON CONFLICT (event_id, artist_id) DO NOTHING
    `;
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

/**
 * Remove duplicate events that were created when a source changed its event title
 * between fetches (e.g. Ticketmaster appending "(Sold Out)").
 * Keeps the most-recently-fetched record for each (source_name, external_id) pair
 * and deletes the rest. CASCADE handles event_sources / event_artists cleanup.
 */
export async function deduplicateEvents(): Promise<number> {
  const result = await sql`
    WITH dupes AS (
      SELECT
        event_id,
        ROW_NUMBER() OVER (
          PARTITION BY source_name, external_id
          ORDER BY fetched_at DESC
        ) AS rn
      FROM event_sources
      WHERE external_id IS NOT NULL
    ),
    stale AS (
      SELECT event_id FROM dupes WHERE rn > 1
    )
    DELETE FROM events
    WHERE id IN (SELECT event_id FROM stale)
    RETURNING id
  `;
  return result.length;
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
