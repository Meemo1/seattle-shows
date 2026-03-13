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

  function deselectAll() {
    setSelected(new Set());
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
        <div className="filters">
          {venues.map((venue) => {
            const active = selected.has(venue.slug);
            return (
              <button
                key={venue.slug}
                onClick={() => toggleVenue(venue.slug)}
                className={`filter-pill${active ? " active" : ""}`}
              >
                {venue.name}
              </button>
            );
          })}
          {allSelected ? (
            <button
              onClick={deselectAll}
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: "13px",
                fontStyle: "italic",
                color: "var(--color-rust)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              Deselect all
            </button>
          ) : (
            <button
              onClick={selectAll}
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: "13px",
                fontStyle: "italic",
                color: "var(--color-rust)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              Select all
            </button>
          )}
        </div>
      )}

      {/* Event groups */}
      {grouped.size === 0 ? (
        <p className="text-center py-12" style={{ color: "var(--color-ochre-muted)" }}>
          No shows match the selected venues.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, dateEvents]) => (
            <section key={date}>
              <div className="sticky top-0 z-10 dateline-header">
                <div className="dateline">
                  <span className="dateline-text">{formatDate(date)}</span>
                  <span className="dateline-count">
                    {dateEvents.length} {dateEvents.length === 1 ? "show" : "shows"}
                  </span>
                </div>
              </div>
              <div className="shows-grid">
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
