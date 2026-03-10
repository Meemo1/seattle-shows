import * as cheerio from "cheerio";
import { RawEvent } from "../../types";

const CALENDAR_URL = "https://tractortavern.com/calendar/";

export async function scrapeTractorTavern(): Promise<RawEvent[]> {
  const response = await fetch(CALENDAR_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Tractor Tavern calendar: ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];
  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();

  $(".flexmedia--artistevents").each((_, el) => {
    const $el = $(el);

    // Title / artist name
    const title = $el.find(".artisteventsname").text().trim();
    if (!title) return;

    // Date and time: "Mar 10 @ 07:30 PM"
    const dateTimeText = $el.find(".artisteventstime").text().trim();
    const dateMatch = dateTimeText.match(
      /(\w{3})\s+(\d{1,2})\s*@\s*(\d{1,2}:\d{2})\s*(AM|PM)/i
    );
    if (!dateMatch) return;

    const monthStr = dateMatch[1];
    const day = parseInt(dateMatch[2]);
    const timeRaw = dateMatch[3];
    const period = dateMatch[4].toUpperCase();

    // Convert month abbreviation to number
    const monthNum = monthToNumber(monthStr);
    if (monthNum === -1) return;

    // Determine year — if month is before current month, it's next year
    const now = new Date();
    let year = currentYear;
    if (monthNum < now.getMonth() + 1) {
      year = currentYear + 1;
    }

    const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Skip past events
    if (dateStr < today) return;

    // Convert time to 24h format
    const time = to24h(timeRaw, period);

    // Price: "$18.90" or "$38.47 - $120.87"
    const priceText = $el.find(".artistseventsprice").text().trim();
    const price = priceText || undefined;

    // Ticket URL from the event link
    const ticketUrl =
      $el.find(".eventsbutton a").attr("href") ||
      $el.find("a.background-wrapper").attr("href") ||
      undefined;

    // Extract TicketWeb event ID from ticket URL
    const idMatch = ticketUrl?.match(/\/(\d+)(?:\?|$)/);
    const sourceId = idMatch ? idMatch[1] : undefined;

    // Extract artist names — try the inline analytics script first for pipe-separated names
    let artistNames: string[] = [];
    const scriptText = $el.find(".eventsbutton script").html() || "";
    const brandMatch = scriptText.match(/'brand'\s*:\s*'([^']+)'/);
    if (brandMatch) {
      artistNames = brandMatch[1]
        .split("|")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
    }

    // Fallback: split title by commas
    if (artistNames.length === 0) {
      artistNames = title
        .split(/\s*[,&]\s*/)
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
    }

    events.push({
      title,
      date: dateStr,
      time,
      venueSlug: "tractor-tavern",
      artistNames: artistNames.length ? artistNames : [title],
      price,
      ticketUrl,
      sourceName: "scraper:tractor",
      sourceId,
      sourceUrl: ticketUrl,
    });
  });

  return events;
}

function monthToNumber(month: string): number {
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  return months[month.toLowerCase()] ?? -1;
}

function to24h(time: string, period: string): string {
  const [h, m] = time.split(":");
  let hours = parseInt(h);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${m}`;
}
