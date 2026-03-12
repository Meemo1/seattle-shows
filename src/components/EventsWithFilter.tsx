"use client";

import { useState, useMemo } from "react";
import { EventWithVenue } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import EventCard from "./EventCard";

export default function EventsWithFilter({
  events,
}: {
  events: EventWithVenue[];
}) {
  // Derive unique venues from the events, preserving order of first appearance
  const venues = useMemo(() => {
    const seen = new Map<string, { slug: string; name: string }>();
    for (const event of events) {
      if (!seen.has(event.venue_slug)) {
        seen.set(event.venue_slug, {
          slug: event.venue_slug,
          name: event.venue_name,
        });
      }
    }
    return Array.from(seen.values());
  }, [events]);

  // All venues selected by default
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(venues.map((v) => v.slug))
  );

  function toggleVenue(slug: string) {
    setSelected((prev) => {
      // Don't allow deselecting the last active venue
      if (prev.has(slug) && prev.size === 1) return prev;
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  const allSelected = selected.size === venues.length;

  function selectAll() {
    setSelected(new Set(venues.map((v) => v.slug)));
  }

  // Filter events by selected venues, then group by date
  const grouped = useMemo(() => {
    const map = new Map<string, EventWithVenue[]>();
    for (const event of events) {
      if (!selected.has(event.venue_slug)) continue;
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }
    return map;
  }, [events, selected]);

  return (
    <>
      {/* Venue filter pills */}
      {venues.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {venues.map((venue) => {
            const active = selected.has(venue.slug);
            return (
              <button
                key={venue.slug}
                onClick={() => toggleVenue(venue.slug)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                }`}
              >
                {venue.name}
              </button>
            );
          })}
          {!allSelected && (
            <button
              onClick={selectAll}
              className="px-3 py-1 rounded-full text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Event groups */}
      {grouped.size === 0 ? (
        <p className="text-center text-gray-500 py-12">
          No shows match the selected venues.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, dateEvents]) => (
            <section key={date}>
              <div className="sticky top-0 z-10 bg-gray-50 pt-2 pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {formatDate(date)}
                  </h2>
                  <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                    {dateEvents.length}{" "}
                    {dateEvents.length === 1 ? "show" : "shows"}
                  </span>
                </div>
                <div className="mt-2 border-b border-gray-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {dateEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
