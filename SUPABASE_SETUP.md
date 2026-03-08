# Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com).

2. **Environment variables**  
   Copy `.env.local.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL (Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key (Settings → API)

3. **Database schema**  
   In the Supabase Dashboard → **SQL Editor**, run the contents of  
   `supabase/migrations/001_initial_schema.sql`.

   This creates:
   - **profiles** — user profiles (synced from auth)
   - **teams** — teams
   - **tournaments** — tournaments
   - **matches** — matches (links teams + tournaments)
   - **rankings** — per-tournament rankings

   Row Level Security (RLS) is enabled; authenticated users can manage data.

4. **Auth**  
   In Dashboard → Authentication → Providers, enable **Email** (or others you need).  
   After sign-up, a row in `profiles` is created automatically via trigger.

5. **Optional: FK names for matches**  
   If `getMatchesWithDetails` fails with a relation error, check the exact foreign key names in  
   Table Editor → `matches` → view table definition, and update the select in  
   `app/actions/data.ts` to use those names (e.g. `teams!matches_team1_id_fkey`).
