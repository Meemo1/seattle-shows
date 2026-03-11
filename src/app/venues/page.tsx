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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Venues</h1>
        <p className="text-gray-500 mb-8">Tracked venues and organizations</p>

        {venues === null ? (
          <p className="text-gray-500">Database not set up yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug}`}
                className="block border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors bg-white"
              >
                <h2 className="font-semibold text-lg">{venue.name}</h2>
                {venue.neighborhood && (
                  <p className="text-sm text-gray-500 mt-0.5">{venue.neighborhood}</p>
                )}
                {venue.vibe && (
                  <p className="text-sm text-gray-400 mt-1">{venue.vibe}</p>
                )}
                <p className="text-sm text-blue-600 mt-2">
                  {venue.event_count} upcoming {venue.event_count === 1 ? "show" : "shows"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
