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

  // Events are inside .em-list > div children
  // Each div contains links to /events/ pages and ticket links (knqt.link), plus date text
  $(".em-list > div").each((_, el) => {
    const $el = $(el);
    const text = $el.text();

    // Find event link (first link to /events/)
    let title = "";
    let sourceUrl = "";
    $el.find("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      const linkText = $(a).text().trim();
      if (href.includes("/events/") && linkText && linkText !== "read more" && !title) {
        title = linkText;
        sourceUrl = href;
      }
    });

    if (!title) return;

    // Find ticket link
    let ticketUrl: string | undefined;
    $el.find("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      if (href.includes("knqt.link") || href.includes("ticket") || href.includes("eventbrite")) {
        ticketUrl = href;
      }
    });

    // Parse date: "Mar 21, 2026 (Sat), 7:30 pm - 10:00 pm"
    const dateMatch = text.match(
      /(\w{3}\s+\d{1,2},\s+\d{4})\s*\(\w+\),?\s*(\d{1,2}:\d{2}\s*[ap]m)/i
    );
    if (!dateMatch) return;

    const parsedDate = new Date(dateMatch[1]);
    if (isNaN(parsedDate.getTime())) return;

    const dateStr = parsedDate.toISOString().split("T")[0];
    const timeStr = parseTime(dateMatch[2]);

    // Skip past events
    const today = new Date().toISOString().split("T")[0];
    if (dateStr < today) return;

    events.push({
      title,
      date: dateStr,
      time: timeStr || undefined,
      venueSlug: "seattle-folklore-society",
      artistNames: [title.split(/\s*[-–—:]\s*/)[0].trim()],
      ticketUrl,
      sourceName: "scraper:folklore-society",
      sourceUrl: sourceUrl.startsWith("http")
        ? sourceUrl
        : `https://seafolklore.org${sourceUrl}`,
    });
  });

  return events;
}

function parseTime(timeStr: string): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  if (!match) return "";
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].toLowerCase();
  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}
