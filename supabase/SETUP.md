# Connecting Ride Buddy to Supabase (with Google sign-in)

About 25 minutes in total. You click through two dashboards; the app code is already done.

> **Secrets:** the Supabase database password and the Google **Client secret** are secret. Paste them only into the
> Supabase or Google dashboards, never into chat or code. The Supabase **URL** and **publishable key** are public by
> design and are fine in `.env.local` and Vercel.

## 1. Create the Supabase project (5 min)

1. Go to https://supabase.com and sign in (e.g. **Continue with GitHub**).
2. **New project** → Name `ride-buddy` → Region **South Asia (Mumbai)** → set a strong database password (save it in
   a password manager) → **Create new project**. Wait a minute or two while it sets up.

## 2. Create the tables and security rules (2 min)

1. In the project, open **SQL Editor** → **New query**.
2. Open `supabase/setup.sql` from this project, copy **all** of it, paste it in, and click **Run**.
3. You should see "Success. No rows returned". (It's safe to run again later.)

## 3. Connect the app (3 min)

1. In Supabase: **Project Settings → API** (or **Connect**). Copy the **Project URL** and the **publishable** key
   (older projects call it the **anon** key).
2. Add them to `.env.local` (on your computer):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. Add the same two variables in **Vercel → ride-buddy-finder → Settings → Environment Variables** (tick
   Production), then **Redeploy**.

## 4. Tell Supabase where the app lives (2 min)

**Authentication → URL Configuration**:
- **Site URL:** `https://ride-buddy-finder.vercel.app`
- **Redirect URLs:** add `https://ride-buddy-finder.vercel.app` and `http://localhost:3000`

Email sign-in links now work. (Supabase's built-in email sender is rate-limited; fine for testing.)

## 5. Turn on Google sign-in (10–15 min)

**In Google Cloud** (https://console.cloud.google.com) — use a personal Gmail account if your school account is blocked:
1. Create a project, e.g. `ride-buddy`.
2. **Google Auth Platform** (or **APIs & Services → OAuth consent screen**): app name **Ride Buddy**, your email as
   support and contact email, audience **External**.
3. **Clients → Create client** → type **Web application**:
   - **Authorized JavaScript origins:** `https://ride-buddy-finder.vercel.app` and `http://localhost:3000`
   - **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (copy the exact one from Supabase: **Authentication → Providers → Google → Callback URL**)
4. Copy the **Client ID** and **Client secret**.
5. While the app is in **Testing**, only test users you add can sign in. To let anyone sign in, click
   **Publish app** (Ride Buddy only asks for name, email and profile photo).

**In Supabase:** **Authentication → Providers → Google** → enable → paste the Client ID and Client secret → **Save**.

## What changes in the app

- The Welcome screen becomes **Sign in**: *Continue with Google* or *Email me a sign-in link*.
- New riders create their profile (name and photo pre-filled from Google). If this browser has prototype data, a
  checkbox offers to bring it into the account.
- Posts, comments, likes, messages, group memberships, bikes and rides are saved in Supabase, and chat updates live.
- Demo riders stay (always labelled **Demo**). Real riders can message each other; demo riders can't reply.

## Security summary (enforced by the database, `supabase/setup.sql`)

- You can only create, edit or delete your own profile, bikes, posts, comments, likes and messages.
- Direct messages are readable only by the two people in them; you can't message someone who blocked you.
- Rides (with full GPS routes) are private to their owner. Shared posts only carry a privacy-trimmed route.
- Gender is stored privately; it's shown on your profile only if you choose.
- Photos go into your own folder in the `media` bucket; nobody else can overwrite them.
- Reports are stored, but no moderation tools exist yet.
