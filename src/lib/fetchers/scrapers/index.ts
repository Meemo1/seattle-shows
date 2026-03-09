import { RawEvent } from "../../types";
import { scrapeSeattleFolkloreSociety } from "./folklore-society";
import { scrapeFremontAbbey } from "./fremont-abbey";

export interface ScraperEntry {
  name: string;
  fn: () => Promise<RawEvent[]>;
}

export const scrapers: ScraperEntry[] = [
  { name: "scraper:folklore-society", fn: scrapeSeattleFolkloreSociety },
  { name: "scraper:fremont-abbey", fn: scrapeFremontAbbey },
];
