export interface Venue {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  neighborhood: string | null;
  website: string | null;
  calendar_url: string | null;
  capacity: string | null;
  vibe: string | null;
  scraper_type: string | null;
  active: boolean;
}

export interface Event {
  id: string;
  venue_id: string;
  title: string;
  date: string;
  time: string | null;
  doors_time: string | null;
  price: string | null;
  ticket_url: string | null;
  description: string | null;
  cancelled: boolean;
}

export interface EventWithVenue extends Event {
  venue_name: string;
  venue_slug: string;
  neighborhood: string | null;
  genre: string | null;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  genre: string | null;
}

export interface RawEvent {
  title: string;
  date: string;
  time?: string;
  doorsTime?: string;
  venueSlug: string;
  artistNames: string[];
  genre?: string;
  price?: string;
  ticketUrl?: string;
  description?: string;
  sourceName: string;
  sourceId?: string;
  sourceUrl?: string;
  rawData?: object;
}
