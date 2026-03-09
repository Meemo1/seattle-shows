import * as cheerio from "cheerio";
import { RawEvent } from "../../types";

export async function scrapeFremontAbbey(): Promise<RawEvent[]> {
  const response = await fetch("https://fremontabbey.org/events/");
  if (!response.ok) {
    throw new Error(`Failed to fetch Fremont Abbey: ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  // Abbey Arts events pages typically have event entries with titles, dates, and ticket links
  // Look for common patterns: headings with event names, date text, ticket links
  $("article, .event-item, .type-tribe_events, [class*='event']").each((_, el) => {
    const $el = $(el);
    const title =
      $el.find("h2 a, h3 a, .tribe-events-list-event-title a, .entry-title a").first().text().trim() ||
      $el.find("h2, h3, .tribe-events-list-event-title, .entry-title").first().text().trim();
    if (!title) return;

    const link =
      $el.find("h2 a, h3 a, .entry-title a").first().attr("href") || "";

    // Look for date text
    const dateEl =
      $el.find("time, .tribe-event-date-start, [class*='date']").first();
    let dateText = dateEl.attr("datetime") || dateEl.text().trim();

    // Also check for date patterns in the text
    if (!dateText) {
      const fullText = $el.text();
      const dateMatch = fullText.match(
        /(\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/
      );
      if (dateMatch) dateText = dateMatch[1];
    }

    if (!dateText) return;

    // Parse date
    const parsedDate = new Date(dateText);
    if (isNaN(parsedDate.getTime())) return;
    const dateStr = parsedDate.toISOString().split("T")[0];

    // Skip past events
    if (parsedDate < new Date()) return;

    // Look for time
    let timeStr: string | undefined;
    const timeMatch = $el.text().match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    if (timeMatch) {
      timeStr = parseTime(timeMatch[1]);
    }

    // Look for ticket link
    let ticketUrl: string | undefined;
    $el.find("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      const text = $(a).text().toLowerCase();
      if (
        text.includes("ticket") ||
        href.includes("ticket") ||
        href.includes("eventbrite") ||
        href.includes("strangertickets")
      ) {
        ticketUrl = href;
      }
    });

    // Look for price
    let price: string | undefined;
    const priceMatch = $el.text().match(/\$\d+(?:\.\d{2})?(?:\s*[-–]\s*\$\d+(?:\.\d{2})?)?/);
    if (priceMatch) price = priceMatch[0];

    events.push({
      title,
      date: dateStr,
      time: timeStr,
      venueSlug: "abbey-arts",
      artistNames: [title.split(/\s*[-–—:@]\s*/)[0].trim()],
      price,
      ticketUrl,
      sourceName: "scraper:fremont-abbey",
      sourceUrl: link.startsWith("http") ? link : `https://fremontabbey.org${link}`,
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
