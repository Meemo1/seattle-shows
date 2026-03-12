import { getUpcomingEvents } from "@/lib/queries";
import Header from "@/components/Header";
import EventsWithFilter from "@/components/EventsWithFilter";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let events;
  try {
    events = await getUpcomingEvents();
  } catch {
    events = null;
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {events === null ? (
          <p className="text-center py-12" style={{ color: "var(--color-ochre-muted)" }}>
            Database not set up yet.
          </p>
        ) : events.length === 0 ? (
          <p className="text-center py-12" style={{ color: "var(--color-ochre-muted)" }}>
            No upcoming shows found.
          </p>
        ) : (
          <EventsWithFilter events={events} />
        )}
      </div>
    </>
  );
}
