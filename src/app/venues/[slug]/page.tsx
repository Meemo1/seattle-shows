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
        <Link href="/venues" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          &larr; All Venues
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-1">{venue.name}</h1>
        {venue.neighborhood && (
          <p className="text-gray-500">{venue.neighborhood}</p>
        )}
        {venue.vibe && (
          <p className="text-sm text-gray-400 mt-1">{venue.vibe}</p>
        )}

        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          {venue.address && <span className="text-gray-500">{venue.address}</span>}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Website
            </a>
          )}
        </div>

        <hr className="my-6 border-gray-200" />

        {events.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">
            No upcoming shows found at this venue.
          </p>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([date, dateEvents]) => (
              <section key={date}>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">
                  {formatDate(date)}
                </h2>
                <div className="space-y-3">
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
