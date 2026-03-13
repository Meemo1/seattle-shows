import { getVenueBySlug, getUpcomingEvents } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import EventCard from "@/components/EventCard";
import Header from "@/components/Header";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  if (!venue) {
    notFound();
  }

  const events = await getUpcomingEvents({ venueSlug: slug });

  // Group events by date
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const existing = grouped.get(event.date) || [];
    existing.push(event);
    grouped.set(event.date, existing);
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/venues"
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: "13px",
            fontStyle: "italic",
            color: "var(--color-rust)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "1.2rem",
          }}
        >
          ← All Venues
        </Link>

        <h1 className="site-title" style={{ fontSize: "36px", marginBottom: "0.2rem" }}>
          {venue.name}
        </h1>
        {venue.neighborhood && (
          <p className="show-neighborhood" style={{ fontSize: "16px" }}>{venue.neighborhood}</p>
        )}
        {venue.vibe && (
          <p className="show-genre" style={{ fontSize: "14px", marginTop: "0.3rem" }}>{venue.vibe}</p>
        )}

        <div className="flex flex-wrap gap-4 mt-3">
          {venue.address && (
            <span className="show-time">{venue.address}</span>
          )}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: "13px",
                fontStyle: "italic",
                color: "var(--color-rust)",
                textDecoration: "none",
              }}
            >
              Website ↗
            </a>
          )}
        </div>

        <hr className="my-6" style={{ borderColor: "var(--color-ochre-border)", opacity: 0.6 }} />

        {events.length === 0 ? (
          <p className="text-center py-8" style={{ color: "var(--color-ochre-muted)" }}>
            No upcoming shows at this venue.
          </p>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([date, dateEvents]) => (
              <section key={date}>
                <div className="dateline-header">
                  <div className="dateline">
                    <span className="dateline-text">{formatDate(date)}</span>
                  </div>
                </div>
                <div className="shows-grid">
                  {dateEvents!.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
