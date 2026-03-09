-- Seed data: Seattle/Ballard venues and music organizations

INSERT INTO venues (name, slug, address, neighborhood, website, calendar_url, scraper_type, vibe) VALUES
  ('Tractor Tavern', 'tractor-tavern', '5213 Ballard Ave NW, Seattle, WA 98107', 'Ballard', 'https://tractortavern.com', 'https://tractortavern.com', 'tractor', 'Americana, folk, alt-country, roots'),
  ('Sunset Tavern', 'sunset-tavern', '5433 Ballard Ave NW, Seattle, WA 98107', 'Ballard', 'https://sunsettavern.com', 'https://sunsettavern.com', 'sunset', 'Indie, rock, eclectic'),
  ('Conor Byrne Pub', 'conor-byrne', '5140 Ballard Ave NW, Seattle, WA 98107', 'Ballard', 'https://www.conorbyrnecoop.org', 'https://www.conorbyrnecoop.org', 'conorbyrne', 'Bluegrass, honky tonk, folk, community co-op'),
  ('The Crocodile', 'the-crocodile', '2505 1st Ave, Seattle, WA 98121', 'Belltown', 'https://www.thecrocodile.com', 'https://www.thecrocodile.com/events', 'crocodile', 'Indie, rock, hip-hop, all genres'),
  ('Neumos', 'neumos', '925 E Pike St, Seattle, WA 98122', 'Capitol Hill', 'https://www.neumos.com', 'https://www.neumos.com/events', 'neumos', 'Indie, electronic, diverse'),
  ('The Showbox', 'the-showbox', '1426 1st Ave, Seattle, WA 98101', 'Downtown', 'https://www.showboxpresents.com', 'https://www.showboxpresents.com/events', 'showbox', 'All genres, historic venue'),
  ('Showbox SoDo', 'showbox-sodo', '1700 1st Ave S, Seattle, WA 98134', 'SoDo', 'https://www.showboxpresents.com', 'https://www.showboxpresents.com/events', 'showbox', 'Larger shows, all genres'),
  ('The Neptune Theatre', 'the-neptune', '1303 NE 45th St, Seattle, WA 98105', 'U-District', 'https://www.stgpresents.org/neptune', 'https://www.stgpresents.org/neptune', 'neptune', 'All genres, beautiful historic theater'),
  ('Ballard Homestead', 'ballard-homestead', '6541 Jones Ave NW, Seattle, WA 98117', 'Ballard', 'https://ballardhomestead.org', 'https://ballardhomestead.org/events', 'homestead', 'Folk, acoustic, community arts space'),
  ('Fremont Abbey Arts Center', 'fremont-abbey', '4272 Fremont Ave N, Seattle, WA 98103', 'Fremont', 'https://fremontabbey.org', 'https://fremontabbey.org/events', 'abbey-arts', 'Intimate concert space, folk, indie, community')
ON CONFLICT (slug) DO NOTHING;

-- Music organizations (tracked as venues with a special scraper_type for now)
-- These put on shows at various venues, so their "address" is their org, not a fixed location
INSERT INTO venues (name, slug, neighborhood, website, calendar_url, scraper_type, vibe) VALUES
  ('Seattle Folklore Society', 'seattle-folklore-society', 'Various', 'https://seafolklore.org', 'https://seafolklore.org/concerts', 'folklore-society', 'Folk, traditional, world music'),
  ('Abbey Arts', 'abbey-arts', 'Various', 'https://www.abbeyarts.me', 'https://www.abbeyarts.me/events', 'abbey-arts', 'Indie, folk, singer-songwriter'),
  ('Seattle Early Music Society', 'seattle-early-music', 'Various', 'https://seattleearlymusic.org', 'https://seattleearlymusic.org/concerts', 'early-music', 'Early, baroque, renaissance music')
ON CONFLICT (slug) DO NOTHING;
