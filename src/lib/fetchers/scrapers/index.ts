import { RawEvent } from "../../types";
import { scrapeSeattleFolkloreSociety } from "./folklore-society";
import { scrapeAbbeyArts } from "./abbey-arts";
import { scrapeTractorTavern } from "./tractor";

export interface ScraperEntry {
  name: string;
  fn: () => Promise<RawEvent[]>;
}

export const scrapers: ScraperEntry[] = [
  { name: "scraper:folklore-society", fn: scrapeSeattleFolkloreSociety },
  { name: "scraper:abbey-arts", fn: scrapeAbbeyArts },
  { name: "scraper:tractor", fn: scrapeTractorTavern },
];
