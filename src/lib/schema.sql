-- Seattle Shows database schema

CREATE TABLE venues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  address       TEXT,
  neighborhood  TEXT,
  website       TEXT,
  calendar_url  TEXT,
  capacity      TEXT,
  vibe          TEXT,
  scraper_type  TEXT,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE artists (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  genre             TEXT,
  bandsintown_id    TEXT,
  ticketmaster_id   TEXT,
  seatgeek_id       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  date          DATE NOT NULL,
  time          TIME,
  doors_time    TIME,
  price         TEXT,
  ticket_url    TEXT,
  description   TEXT,
  cancelled     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venue_id, date, title)
);

CREATE TABLE event_artists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  billing     TEXT DEFAULT 'main',
  UNIQUE(event_id, artist_id)
);

CREATE TABLE event_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_name   TEXT NOT NULL,
  external_id   TEXT,
  source_url    TEXT,
  raw_data      JSONB,
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, source_name)
);

CREATE TABLE fetch_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name   TEXT NOT NULL,
  status        TEXT NOT NULL,
  events_found  INTEGER DEFAULT 0,
  events_new    INTEGER DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_venue_date ON events(venue_id, date);
CREATE INDEX idx_event_artists_artist ON event_artists(artist_id);
CREATE INDEX idx_fetch_log_source ON fetch_log(source_name, started_at);
