# Ride Buddy

**Find your people. Ride your road.** A community prototype for motorcycle riders in Bengaluru.

- **Home:** a social feed of rides, bikes, riding journeys, questions and planned group rides. Post with an optional photo, bike tag and ride stats. Like, comment, share, edit and delete your own posts. **Find riding buddies** (rider matching) starts here.
- **Chat:** direct messages and riding groups. Browse, join and leave groups, read group chats, block and report.
- **Map:** start a ride with GPS (only after you allow location), pause, resume and end it, see a summary, then save it and optionally share it to the feed. You can also add a ride manually.
- **Profile:** your rider identity, a garage of bikes chosen from a searchable catalogue that includes BMW Motorrad, ride history, and stats calculated from your saved rides.

## Two modes

- **With Supabase** (when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set): real sign-in
  with Google or an email link, a shared feed, real messages and groups with live updates, and photos and rides stored
  in the database. Setup guide: [`supabase/SETUP.md`](supabase/SETUP.md). Schema and security rules:
  [`supabase/setup.sql`](supabase/setup.sql).
- **Without Supabase**: the device-only prototype described below.

## Prototype: what is real and what isn't

| Part | How it works now |
|---|---|
| Your profile, bikes, posts, comments, likes, messages, group memberships, rides | Saved **in this browser only** (`lib/store.ts`, localStorage). There is no real account and no password, and nothing is shared between people or devices. Clearing site data deletes it. |
| Other riders, their posts, comments and groups | **Fictional demo content** (`data/riders.json`, `data/demo-posts.json`, `data/groups.json`), always labelled "Demo". Demo riders can't reply. |
| Block and report | Hides content on this device and saves the report locally. No moderation team reviews reports. |
| Rider matching and AI | **Real**: server API routes call Gemini through OpenRouter. |
| Map and GPS tracking | **Real**: MapLibre with free OpenFreeMap tiles, and the browser's location API, but only while the Map page is open. |

To make this a real multi-user product, replace `lib/store.ts` with a backend (for example Supabase: auth, Postgres, storage and realtime chat) using the same shapes as `lib/model.ts`.

## Rider matching: who decides what

| Job | Done by |
|---|---|
| Reading your sentence into suggested preferences | AI (`/api/interpret`). You review and correct every field before matching. |
| Matching the bike you mentioned to the catalogue | Plain code search |
| Hard filters: shared free time, nearby area, beginner safety rule, women-only (both ways) | Plain code (`lib/filters.ts`) |
| Ranking the filtered shortlist and writing match reasons from code-checked shared facts | AI. Code drops invented or filtered-out riders and fills gaps. |
| Drafting the intro | AI. You edit it, then copy it or open it in Chat (nothing is sent automatically). |

## Run it on your computer

```bash
npm install
```

Create `.env.local` (see `.env.example`) with your OpenRouter key:

```
OPENROUTER_API_KEY=sk-or-...
```

```bash
npm run dev
```

Then open http://localhost:3000. Without a key, the app still works: matching falls back to simple rules, and AI features show a friendly "try again".

### Optional settings

| Variable | What it does |
|---|---|
| `OPENROUTER_MODEL` / `OPENROUTER_FAST_MODEL` | Models used for ranking and for the fast jobs (intro, sentence reading, bike check) |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Any MapLibre style URL (default: OpenFreeMap dark, no key needed) |
| `NEXT_PUBLIC_MAPLIBRE_WORKER_URL` | Where to load MapLibre's worker from (default: copied into `public/` before dev and build) |

## Tests

```bash
npm test
```

Covers the hard filters (including women-only and the beginner safety rule), how AI picks are checked, the bike catalogue and search (BMW included), preference validation, GPS sample filtering, distance, the privacy trim of shared routes, and the ride tracker.

## Privacy and safety choices

- Location is requested only when you tap **Start ride**, and never in the background.
- Shared routes hide the first and last 300 m, so your start and end points (often home) aren't shown.
- Rides are private until you choose **Share to feed**.
- Areas are approximate. Gender is optional, hidden unless you choose to show it, and used only for the women-only filter.
- No rider is described as verified or safe, and there are no ratings or reliability scores.

## Deploy (Vercel)

Push to GitHub. Vercel builds automatically. Set `OPENROUTER_API_KEY` in **Settings → Environment Variables** (Production), then redeploy.
