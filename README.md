# slides

Personal slide CMS (fork of my-slides) using **Supabase Postgres** and **Supabase Auth** (email registration + sign-in). Reveal.js presenter, JSON import/export, optional MCP.

## Do you need a CDN or object storage bucket?

**No, not for a typical setup.**

- Deck content lives in **Postgres** (`presentations.document` JSON).
- Presenter mode renders Markdown in the browser; external images can use any public `https://` URL in slide Markdown.

**Optional:** enable storage only if you use the CMS **image upload** button.

| Option | When to use |
|--------|-------------|
| **Nothing** (default) | Text/Markdown decks, embedded remote images |
| **Supabase Storage** (recommended if you upload) | One product, free tier, public bucket URLs |
| **S3 / R2 / MinIO** | Set `S3_ASSETS_BUCKET` + credentials in `.env` (existing code path) |

You do **not** need CloudFront or a separate CDN for a personal site unless you serve large traffic or global image-heavy assets.

## Quick start (hosted Supabase)

1. Create a project at [supabase.com](https://supabase.com).

2. **Database schema** — either:
   - SQL Editor: paste `supabase/migrations/20251014000000_presentations.sql`, or
   - CLI: `supabase link` then `supabase db push`

3. **Auth** — Authentication → Providers → Email: enable.  
   For local dev, turn off “Confirm email” or confirm via inbox.  
   Add your site URL under Authentication → URL configuration:
   - Site URL: `http://localhost:3091` (and your production domain later; port **3091** avoids clashing with my-slides on 3090)
   - Redirect URLs: `http://localhost:3091/auth/callback`, `https://yourdomain.com/auth/callback`

4. Copy env:

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_EMAILS`, and `APP_PUBLIC_URL`.

5. Install and run:

   ```bash
   npm install
   npm run migrate   # optional if you already applied SQL in the dashboard
   npm run dev       # API + Vite on http://localhost:3091
   ```

6. Register in the UI, then create decks at `/`.

## Local Supabase (optional)

```bash
brew install supabase/tap/supabase
supabase start
```

Use the printed `API URL`, `anon key`, and Postgres URL in `.env` (`DATABASE_SSL=false` for local).

## Deploy (single container)

Point your domain at any host that runs Docker (VPS, Fly, Railway, etc.):

```bash
docker compose up --build -d
```

Set `APP_PUBLIC_URL=https://yourdomain.com` and the same URL in Supabase Auth settings.

## MCP

See [docs/mcp.md](docs/mcp.md). Set `MCP_API_KEY` when auth is enabled.

## Project layout

```
slides/
  client/           React CMS + Reveal
  src/              Express API, Supabase JWT verification
  db/migrations/    Postgres migrations (`npm run migrate`)
  supabase/         CLI migrations + config
```
