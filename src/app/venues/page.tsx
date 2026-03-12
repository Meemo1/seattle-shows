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
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug}`}
                className="show-card block"
                style={{ textDecoration: "none" }}
              >
                <span className="show-venue">{venue.name}</span>
                {venue.neighborhood && (
                  <span className="show-neighborhood block mt-0.5">{venue.neighborhood}</span>
                )}
                {venue.vibe && (
                  <span className="show-genre block mt-1">{venue.vibe}</span>
                )}
                <span className="show-price block mt-2" style={{ fontSize: "12px" }}>
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
