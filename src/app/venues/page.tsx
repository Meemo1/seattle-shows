import { getVenues } from "@/lib/queries";
import Header from "@/components/Header";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  let venues;
  try {
    venues = await getVenues();
  } catch {
    venues = null;
  }

  const activeVenues = venues?.filter((v) => v.event_count > 0) ?? null;

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {venues === null ? (
          <p className="text-center py-12" style={{ color: "var(--color-ochre-muted)" }}>
            Database not set up yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeVenues!.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug}`}
                className="show-card block"
                style={{ textDecoration: "none" }}
              >
                <span className="show-name" style={{ fontSize: "20px" }}>
                  {venue.name}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  {venue.neighborhood && (
                    <span className="show-neighborhood">{venue.neighborhood}</span>
                  )}
                  {venue.neighborhood && venue.vibe && (
                    <span className="show-dot">·</span>
                  )}
                  {venue.vibe && (
                    <span className="show-genre">{venue.vibe}</span>
                  )}
                </div>
                <span className="dateline-count" style={{ marginTop: "8px", display: "block" }}>
                  {venue.event_count} upcoming {venue.event_count === 1 ? "show" : "shows"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
