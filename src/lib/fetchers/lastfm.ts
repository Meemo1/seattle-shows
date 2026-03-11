import sql from "../db";

const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

// Tags that describe demographics or listening habits rather than genre — skip these
const META_TAGS = new Set([
  "seen live",
  "favorites",
  "favourite",
  "american",
  "british",
  "canadian",
  "female vocalists",
  "male vocalists",
  "under 2000 listeners",
  "all",
  "good",
  "awesome",
  "love",
  "beautiful",
  "catchy",
]);

async function getArtistGenre(
  artistName: string,
  apiKey: string
): Promise<string | null> {
  const url = new URL(LASTFM_API);
  url.searchParams.set("method", "artist.getTopTags");
  url.searchParams.set("artist", artistName);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const data = await response.json();
  const tags: { name: string; count: number }[] = data?.toptags?.tag || [];

  // Take the first tag with meaningful count that isn't a meta-tag
  for (const tag of tags) {
    if (tag.count < 10) break; // low-count tags are noise
    const name = tag.name.toLowerCase();
    if (!META_TAGS.has(name) && name.length > 1) {
      return tag.name.toLowerCase();
    }
  }
  return null;
}

/**
 * Enrich up to `limit` artists that have no genre by calling Last.fm's
 * artist.getTopTags endpoint. Stores the top meaningful genre tag back
 * into `artists.genre`. Returns the count of artists successfully enriched.
 *
 * Rate: 250ms between calls → ~4/sec, well under Last.fm's 5/sec limit.
 */
export async function enrichArtistGenres(
  apiKey: string,
  limit = 30
): Promise<number> {
  // Find artists with no genre, ordered by most-recently-created first
  const artists = await sql`
    SELECT id, name, slug FROM artists
    WHERE genre IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  if (artists.length === 0) return 0;

  let enriched = 0;

  for (const artist of artists) {
    try {
      const genre = await getArtistGenre(artist.name as string, apiKey);
      if (genre) {
        await sql`
          UPDATE artists SET genre = ${genre}
          WHERE id = ${artist.id as string} AND genre IS NULL
        `;
        enriched++;
      }
    } catch {
      // Silently skip failures — enrichment is best-effort
    }

    // Respect Last.fm rate limit
    await new Promise((r) => setTimeout(r, 250));
  }

  return enriched;
}
