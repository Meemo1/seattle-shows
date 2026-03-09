import { EventWithVenue } from "@/lib/types";
import { formatTime } from "@/lib/utils";

export default function EventCard({ event }: { event: EventWithVenue }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-tight">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-gray-600">
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
              {event.venue_name}
            </span>
            {event.neighborhood && (
              <span className="text-gray-400">{event.neighborhood}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
            {event.time && <span>{formatTime(event.time)}</span>}
            {event.price && <span>{event.price}</span>}
          </div>
        </div>
        {event.ticket_url && (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
          >
            Tickets
          </a>
        )}
      </div>
    </div>
  );
}
