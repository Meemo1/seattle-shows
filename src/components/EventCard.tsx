import { EventWithVenue } from "@/lib/types";
import { formatTime } from "@/lib/utils";

const FREE_RE = /free|donation/i;

export default function EventCard({ event }: { event: EventWithVenue }) {
  const isFree = Boolean(event.price && FREE_RE.test(event.price));

  return (
    <div className="show-card">
      <div className="show-card-top">
        <span className="show-name">{event.title}</span>
        {event.ticket_url && (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className={isFree ? "btn-free" : "btn-tickets"}
          >
            {isFree ? "Free" : "Tickets"}
          </a>
        )}
      </div>

      <div className="show-venue-row">
        <span className="show-venue">{event.venue_name}</span>
        {event.neighborhood && (
          <>
            <span className="show-dot">·</span>
            <span className="show-neighborhood">{event.neighborhood}</span>
          </>
        )}
      </div>

      <div className="show-meta">
        {event.time && <span className="show-time">{formatTime(event.time)}</span>}
        {event.price && <span className="show-price">{event.price}</span>}
        {event.genre && <span className="show-genre">{event.genre}</span>}
      </div>
    </div>
  );
}
