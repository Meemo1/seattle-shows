import { RawEvent } from "../../types";
import { scrapeSeattleFolkloreSociety } from "./folklore-society";

export interface ScraperEntry {
  name: string;
  fn: () => Promise<RawEvent[]>;
}

export const scrapers: ScraperEntry[] = [
  { name: "scraper:folklore-society", fn: scrapeSeattleFolkloreSociety },
  // Fremont Abbey events page only shows old events — disabled for now
];
