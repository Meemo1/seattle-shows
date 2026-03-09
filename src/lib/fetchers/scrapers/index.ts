import { RawEvent } from "../../types";
import { scrapeSeattleFolkloreSociety } from "./folklore-society";
import { scrapeAbbeyArts } from "./abbey-arts";

export interface ScraperEntry {
  name: string;
  fn: () => Promise<RawEvent[]>;
}

export const scrapers: ScraperEntry[] = [
  { name: "scraper:folklore-society", fn: scrapeSeattleFolkloreSociety },
  { name: "scraper:abbey-arts", fn: scrapeAbbeyArts },
];
