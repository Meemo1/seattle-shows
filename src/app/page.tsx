import { getUpcomingEvents } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import EventCard from "@/components/EventCard";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let events;
  try {
    events = await getUpcomingEvents();
  } catch {
    events = null;
  }

  // Group events by date
  const grouped = new Map<string, typeof events>();
  if (events) {
    for (const event of events) {
      const existing = grouped.get(event.date) || [];
      existing.push(event);
      grouped.set(event.date, existing);
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Shows</h1>
        <p className="text-gray-500 mb-8">
          Live music in Seattle and Ballard
        </p>

        {events === null ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Database not set up yet</p>
            <p className="text-sm">
              Run the schema SQL in your Neon dashboard, then seed the venue data.
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No upcoming shows found</p>
            <p className="text-sm">
              Try running a data fetch to populate events.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([date, dateEvents]) => (
              <section key={date}>
                <h2 className="text-lg font-semibold text-gray-700 mb-3 sticky top-0 bg-gray-50 py-2">
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
