# Ride Buddy Finder (MVP)

Helps new or solo motorcycle riders in Bengaluru find compatible riding partners.

1. Create a rider profile: your level, your bike (brand and model), your area, and when you're free.
2. Take a 7-question quiz to find your riding character: Cruiser, Explorer, Carver or Social Rider.
3. See 3 compatible riders, each with a reason for the match.
4. Draft a friendly intro message, edit it and copy it. Nothing is ever sent.

> All riders are **fictional demo profiles** (`data/riders.json`). This demo shows matching, not a live rider network.

## Run it on your computer

1. Install packages (only needed once):
   ```bash
   npm install
   ```
2. Create an OpenRouter API key at https://openrouter.ai/settings/keys. The app uses Google's Gemini model through OpenRouter.
3. Copy `.env.example` to a new file called `.env.local` and paste your key after `OPENROUTER_API_KEY=`.
   `.env.local` is ignored by git, so the key never goes to GitHub.
4. Start the app and open http://localhost:3000:
   ```bash
   npm run dev
   ```

Without a key the app still works, with two differences: matches are ranked by simple rules, and intro drafting shows a friendly "try again" message.

## Tests

```bash
npm test
```

The tests check quiz scoring, form validation, the hard filters (shared time slot, nearby area, beginner safety rule) and how the AI's picks are checked.

## How it decides (who does what)

| Job | Done by |
|---|---|
| Form checks, saved-profile checks | Plain code (`lib/profile.ts`) |
| Riding character from the quiz | Plain code (`lib/quiz.ts`) |
| Hard filters + safety rule (beginners never matched with advanced Carvers) | Plain code (`lib/filters.ts`) |
| Checking the AI's picks, filling gaps, never inventing riders | Plain code (`lib/matching.ts`) |
| Is a typed-in "Other" bike real? | Gemini via OpenRouter (`lib/ai.ts`) |
| Ranking the filtered shortlist + match reasons | Gemini via OpenRouter (`lib/ai.ts`) |
| Drafting the intro | Gemini via OpenRouter (`lib/ai.ts`) |

The OpenRouter key is only used in server code. `lib/ai.ts` imports `server-only`, so the build fails if browser code ever imports it.

## Deploy to Vercel

1. Push this project to GitHub.
2. On https://vercel.com, click **Add New → Project** and import the GitHub repo.
3. Under **Environment Variables**, add `OPENROUTER_API_KEY` with your key.
4. Click **Deploy**.
