# SF Event Tracker

SF Event Tracker is a map-first Next.js app that aggregates public events happening across San Francisco. It blends a live Leaflet map, a filterable event list, and actionable detail drawers so people can discover what is happening nearby within a few clicks.

## Key Functionality
- **Map & list in sync** – The home page splits the viewport between a clustered map and a scrollable list. Panning or zooming the map (`bbox`), or changing filters, automatically re-fetches `/api/events`.
- **Powerful filters** – Search bar, date presets or custom range, multi-select categories, price ranges, time-of-day, and an auto-refresh cadence keep the dataset relevant on both desktop and mobile (`FiltersBar`/`FiltersPanel`).
- **Cluster + detail drawers** – Clicking a marker opens an event drawer with time, venue, pricing, categories/tags, confidence score, ticket/source links, and controls such as “Center on selected.” Selecting a cluster opens a companion drawer to browse every event at that location.
- **Directions & user location** – Users can toggle “My Location,” request walking/biking/driving routes via `/api/directions` (OSRM), or bounce out to Google Maps. Routes render directly on the map and surface turn-by-turn steps in the drawer.
- **Secondary surfaces** – Dedicated `/event/[id]` pages showcase individual events (seed data) and `/about` tells the product story with marketing copy and imagery.

## User Flow
1. **Open the map** – Hit `/` to see the header, live “Last updated” badge, My Location toggle, manual refresh, filters, and the map/list split.
2. **Refine the timeline** – Pick “Today,” “Next 3 days,” “Next 7 days,” or a custom start/end. Adjust price, category chips, and time-of-day to narrow results. Filters sync to the URL so links stay shareable.
3. **Explore the city** – Pan/zoom around SF; the app debounces map movements, recomputes Supercluster groupings, and refreshes the list count. Empty states explain when nothing matches.
4. **Dive into details** – Click any pin or list card to open the Event Detail Drawer. Read the description, preview imagery, see venue/address, categories/tags, confidence, and action buttons (tickets/source). Use “Center on selected,” or “Back to Events” when drilling in from a cluster.
5. **Plan the trip** – Enable My Location, choose a travel mode, request “Get Directions,” and optionally open the route in Google Maps. Auto-refresh can keep the view live during an outing, and the refresh button can also trigger `/api/ingest/run` to kick off a ingest job.

## How It Works
- **Data ingestion (`POST /api/ingest/run`)** – Discovers candidate URLs (SerpAPI), downloads HTML with rotating User-Agents, extracts structured data per post via OpenAI, geocodes with Google Maps, deduplicates using fuzzy title + time windows, then upserts into Postgres through Prisma (`Event`/`Source` models). Dry runs can sample without writing.
- **APIs feeding the UI** – `GET /api/events` applies server-side date + category filters, confidence thresholds, optional bounding boxes, and returns typed `ApiEvent` objects alongside `lastUpdated`. `GET /api/categories` hydrates the filter controls. `GET /api/directions` proxies OSRM for map overlays, `/api/admin/geocode-events` backfills missing coordinates, `/api/feedback` logs user feedback, and `/api/health` verifies database connectivity.
- **Frontend stack** – Next.js App Router (React 19, TypeScript), Tailwind + shadcn/ui, Leaflet + Supercluster for map UX, cmdk-powered category picker, Resizable Panels for map/list split, and shared hooks (e.g., `useToast`) for client feedback.

## Getting Started
1. **Install & prepare**
   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```
2. **Configure env vars** – Required: `DATABASE_URL`, `OPENAI_API_KEY`, `SERPAPI_KEY`, `GOOGLE_MAPS_API_KEY`. Optional helpers: `REDIS_URL`, `UPSTASH_*` for rate limiting, etc.
3. **Run locally**
   ```bash
   npm run dev
   ```
4. **Refresh data** – Call `POST /api/ingest/run` (set `dryRun` during development). Use `/api/admin/geocode-events` after manual imports to fill missing coordinates.

With those pieces in place you get a continuously-updating, map-driven window into SF’s concerts, markets, meetups, and more. Adjust filters, inspect events, pull directions, and keep the data synchronized—all without leaving the main page.

