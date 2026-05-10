# DocuMind

**Vectorless RAG document Q&A.** Chat with PDFs without embeddings or a vector database — the LLM agentically navigates your documents using `get_outline`, `read_section`, `search_document`, and `read_pages` tools, and cites every answer back to the exact section and page.

## Tech stack

- **Next.js 16** (App Router) + React 19.2 + TypeScript strict
- **Tailwind v4** + shadcn/ui (`base-sera` style, base-ui primitives)
- **Supabase** — auth (email magic link + Google), Postgres, Storage. **No pgvector.**
- **OpenRouter** → `deepseek/deepseek-v4-flash` via the **Vercel AI SDK v6**
- **`unpdf`** — modern PDF parsing, no native deps
- **Stripe** — Free / Pro subscriptions
- pnpm, Vercel

## Phase 1 status

This phase ships the scaffolding everything else builds on:

- Landing page (hero, 3 features, pricing, FAQ)
- `/login` with magic-link + Google OAuth
- `/dashboard` protected route with documents grid (empty-state for now — upload lands in Phase 2)
- Supabase clients (browser + server + service-role)
- `proxy.ts` for session refresh + redirect of unauthenticated `/dashboard` requests
- `auth/callback` route handler for OAuth + magic-link
- Full Postgres schema + RLS policies in `supabase/migrations/0001_init.sql`
- Storage bucket `documents` with per-user RLS

> **Heads up — Next.js 16:** `middleware.ts` is now `proxy.ts` (named export `proxy`), `cookies()` / `headers()` / `params` / `searchParams` are async, and Turbopack is the default for `dev` and `build`.

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

- **Supabase** — create a project at [supabase.com](https://supabase.com), grab the URL and anon key from *Project Settings → API*. The service-role key is on the same page — keep it server-only.
- **OpenRouter** — create a key at [openrouter.ai](https://openrouter.ai/keys).
- **Stripe** — only needed in Phase 4. Leave blank for now.
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for dev.

### 3. Run the migration

In the Supabase Dashboard → *SQL Editor*, paste the contents of `supabase/migrations/0001_init.sql` and run.

This creates:

- `profiles`, `documents`, `document_sections`, `document_pages`, `conversations`, `messages`
- A trigger that auto-creates a `profiles` row on signup
- RLS policies on every table (each user only sees their own rows)
- A private `documents` storage bucket with per-user folder-scoped access

Or, if you have the Supabase CLI linked:

```bash
supabase db push
```

### 4. Configure auth providers

In the Supabase Dashboard → *Authentication → URL Configuration*, set:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/auth/callback`

For Google OAuth: *Authentication → Providers → Google* → enable, add your Google OAuth client ID/secret. (See [Supabase Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google).)

### 5. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

```
app/
  page.tsx                    # Landing page
  login/                      # Magic link + Google sign-in
  auth/callback/route.ts      # OAuth + magic-link exchange
  dashboard/page.tsx          # Protected document grid
components/
  ui/                         # shadcn/ui (base-sera)
  site/                       # App-specific shared components
lib/
  supabase/
    client.ts                 # Browser client
    server.ts                 # Server + service-role clients
    proxy.ts                  # Session refresh helper
  auth/
    dal.ts                    # Cached getUser / requireUser
    actions.ts                # signOut server action
proxy.ts                      # Next.js 16 proxy (was middleware.ts)
supabase/migrations/          # SQL migrations
```

## Roadmap

- **Phase 1** — Scaffold + Auth + DB schema ✅
- **Phase 2** — PDF upload, parse, build hierarchical TOC, store pages
- **Phase 3** — Agentic chat with tools + streaming + citations
- **Phase 4** — Stripe paywall + usage limits
