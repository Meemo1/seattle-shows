import { RawEvent } from "../types";

// VenuePilot GraphQL API — used by Conor Byrne Pub
// Account ID 194 = Conor Byrne Cooperative
const VENUEPILOT_GRAPHQL = "https://www.venuepilot.co/graphql";

interface VPEvent {
  id: number;
  name: string;
  description: string | null;
  date: string;
  status: string | null;
  startTime: string | null;
  endTime: string | null;
  doorTime: string | null;
  ticketsUrl: string | null;
  tags: string[];
  venue: {
    id: number;
    name: string;
  };
}

const VP_ACCOUNTS = [
  {
    accountId: 194,
    venueSlug: "conor-byrne",
    websiteBase: "https://www.conorbyrnepub.com/#/events",
  },
];

export async function fetchVenuePilot(): Promise<RawEvent[]> {
  const allEvents: RawEvent[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const account of VP_ACCOUNTS) {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 5) {
        const query = `{
          publicEvents(accountId: ${account.accountId}, startDate: "${today}", page: ${page}, limit: 100) {
            id
            name
            description
            date
            status
            startTime
            endTime
            doorTime
            ticketsUrl
            tags
            venue {
              id
              name
            }
          }
        }`;

        const response = await fetch(VENUEPILOT_GRAPHQL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          console.error(
            `VenuePilot API error for account ${account.accountId}: ${response.status}`
          );
          break;
        }

        const data = await response.json();
        const events: VPEvent[] = data.data?.publicEvents || [];

        if (events.length === 0) {
          hasMore = false;
          break;
        }

        for (const event of events) {
          // Skip past events (shouldn't happen with startDate filter, but just in case)
          if (event.date < today) continue;

          // Format time from "HH:MM:SS" to "HH:MM"
          const time = event.startTime?.slice(0, 5) || undefined;
          const doorsTime = event.doorTime?.slice(0, 5) || undefined;

          // Build source URL
          const sourceUrl = `${account.websiteBase}/${event.id}`;

          // Extract artist name from event name
          // Conor Byrne events are usually "Artist Name" or "Artist, Artist2, Artist3"
          const artistNames = event.name
            .split(/\s*[,+&]\s*/)
            .map((a) => a.trim())
            .filter((a) => a.length > 0);

          allEvents.push({
            title: event.name,
            date: event.date,
            time,
            doorsTime,
            venueSlug: account.venueSlug,
            artistNames: artistNames.length ? artistNames : [event.name],
            ticketUrl: event.ticketsUrl || undefined,
            description: event.description
              ? event.description.replace(/<[^>]*>/g, "").trim()
              : undefined,
            sourceName: "venuepilot",
            sourceId: String(event.id),
            sourceUrl,
          });
        }

        // If we got fewer than 100, there are no more pages
        if (events.length < 100) {
          hasMore = false;
        }
        page++;

        // Small delay between pages
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (err) {
      console.error(
        `Error fetching VenuePilot for account ${account.accountId}:`,
        err
      );
    }
  }

  return allEvents;
}
