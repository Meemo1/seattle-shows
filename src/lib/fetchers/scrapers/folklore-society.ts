import * as cheerio from "cheerio";
import { RawEvent } from "../../types";

export async function scrapeSeattleFolkloreSociety(): Promise<RawEvent[]> {
  const response = await fetch("https://seafolklore.org/concerts");
  if (!response.ok) {
    throw new Error(`Failed to fetch Seattle Folklore Society: ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  // Each concert has an h3 with the title, followed by p tags with date, tickets, venue
  $("h3").each((_, heading) => {
    const $heading = $(heading);
    const titleLink = $heading.find("a");
    const title = titleLink.text().trim();
    if (!title) return;

    const sourceUrl = titleLink.attr("href") || "";

    // Look at the sibling elements after this h3 for date/time, ticket, venue info
    let dateText = "";
    let ticketUrl = "";
    let venueText = "";
    let description = "";

    let $next = $heading.next();
    while ($next.length && $next.prop("tagName") !== "H3") {
      const text = $next.text().trim();

      // Date pattern: "Mar 21, 2026 (Sat), 7:30 pm - 10:00 pm"
      if (/\b\d{4}\b.*\b\d{1,2}:\d{2}\s*(am|pm)\b/i.test(text) && !dateText) {
        dateText = text;
      }
      // Ticket link
      else if (/buy tickets|tickets online/i.test(text)) {
        const link = $next.find("a").attr("href");
        if (link) ticketUrl = link;
      }
      // Venue info
      else if (/^venue:/i.test(text)) {
        venueText = text.replace(/^venue:\s*/i, "");
      }
      // Description (any other paragraph with substantial text)
      else if (text.length > 30 && !text.startsWith("--")) {
        description = text;
      }

      $next = $next.next();
    }

    if (!dateText) return;

    // Parse the date: "Mar 21, 2026 (Sat), 7:30 pm - 10:00 pm"
    const dateMatch = dateText.match(
      /(\w+\s+\d{1,2},\s+\d{4})\s*\(\w+\),?\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i
    );
    if (!dateMatch) return;

    const parsedDate = new Date(dateMatch[1]);
    if (isNaN(parsedDate.getTime())) return;

    const dateStr = parsedDate.toISOString().split("T")[0];

    // Parse time: "7:30 pm" -> "19:30"
    const timeStr = parseTime(dateMatch[2]);

    events.push({
      title,
      date: dateStr,
      time: timeStr,
      venueSlug: "seattle-folklore-society",
      artistNames: [title.split(/\s*[-–—:]\s*/)[0].trim()],
      ticketUrl: ticketUrl || undefined,
      description: description || venueText || undefined,
      sourceName: "scraper:folklore-society",
      sourceUrl: sourceUrl.startsWith("http") ? sourceUrl : `https://seafolklore.org${sourceUrl}`,
    });
  });

  return events;
}

function parseTime(timeStr: string): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return "";
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].toLowerCase();
  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}
