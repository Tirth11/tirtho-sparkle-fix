# Running this project locally

This app was built on Lovable (TanStack Start + Supabase + Lovable AI Gateway). You can run it on your own machine — here's how.

## 1. Get the code

In the Lovable editor, click **GitHub → Connect** (top right), then on your machine:

```bash
git clone <your-repo-url>
cd <repo>
```

## 2. Install dependencies

Requires **Node 20+** and [Bun](https://bun.sh) (or npm/pnpm).

```bash
bun install
```

## 3. Configure environment variables

Create a `.env` file in the project root:

```env
# --- Supabase (browser) ---
VITE_SUPABASE_URL=https://eepqnhefxkakkuxvsskh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHFuaGVmeGtha2t1eHZzc2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjMwODgsImV4cCI6MjA5NTg5OTA4OH0.o3iGcn23j8ese1S-ZMnGuE9qsW0_UO0AoFKVXwias18
VITE_SUPABASE_PROJECT_ID=eepqnhefxkakkuxvsskh

# --- Supabase (server) — same values, different names ---
SUPABASE_URL=https://eepqnhefxkakkuxvsskh.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHFuaGVmeGtha2t1eHZzc2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjMwODgsImV4cCI6MjA5NTg5OTA4OH0.o3iGcn23j8ese1S-ZMnGuE9qsW0_UO0AoFKVXwias18

# --- AI Gateway (required for the chatbot / compare features) ---
# Get this from https://lovable.dev (Workspace Settings → API keys).
# If you don't want to depend on Lovable, see "Going fully independent" below.
LOVABLE_API_KEY=lov_xxxxxxxxxxxxxxxxxxxxxx
```

> The Supabase values above are the public publishable/anon keys for the project you built on Lovable Cloud. They are safe to commit but `.env` is gitignored by default.

## 4. Run

```bash
bun run dev
```

Open <http://localhost:3000> (or whatever port Vite prints).

## 5. Build for production

```bash
bun run build
bun run start
```

---

## What you cannot get from Lovable

These are **not retrievable** for Lovable Cloud projects:

- `SUPABASE_SERVICE_ROLE_KEY` (the server-side admin key)
- The Postgres database password / direct `psql` access
- A full `pg_dump` of the database (CSV exports per table are available from Cloud → Database → Tables)

The app runs fine without them — all server functions use the publishable key plus the signed-in user's JWT, and RLS enforces access. You only need the service role key if you want to run admin scripts outside the app.

---

## Going fully independent (no Lovable account needed)

If you want to cut the Lovable dependency entirely:

### Replace Supabase

1. Create a new project at <https://supabase.com>.
2. Apply the migrations from `supabase/migrations/` (in timestamp order) via the Supabase SQL editor or `supabase db push`.
3. Update the `VITE_SUPABASE_*` and `SUPABASE_*` values in `.env` to point at your new project.
4. Re-enable any social auth providers (Google etc.) from the Supabase dashboard.

### Replace the AI Gateway

The app calls `https://ai.gateway.lovable.dev/v1` via the helper in `src/lib/ai-gateway.server.ts` (or similar). To swap to OpenAI or Google directly:

1. `bun add @ai-sdk/openai` (or `@ai-sdk/google`)
2. In the gateway helper, replace `createLovableAiGatewayProvider(...)` with:
   ```ts
   import { createOpenAI } from "@ai-sdk/openai";
   export const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
   ```
3. Update model IDs at call sites (e.g. `gpt-4o-mini` instead of `google/gemini-3-flash-preview`).
4. Add `OPENAI_API_KEY=sk-...` to `.env` and remove `LOVABLE_API_KEY`.

Tell me when you're ready to do this swap and I'll wire it up in the codebase.

---

## Hosting

- **Lovable** (current): already live at <https://tirthoai.lovable.app>. Push to GitHub → Lovable auto-deploys.
- **Vercel / Netlify / Cloudflare**: build the static frontend with `bun run build` and point the host at the output. TanStack Start server functions need a Node/Edge adapter — see the [TanStack Start deployment docs](https://tanstack.com/start/latest/docs/framework/react/hosting).
- **Self-hosted**: `bun run start` after `bun run build` works behind any reverse proxy.

---

## Troubleshooting

- **"Missing LOVABLE_API_KEY"** — add it to `.env`, or do the gateway swap above.
- **Auth 401s** — confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` match what's in Lovable Cloud → Settings.
- **Google sign-in "Unsupported provider"** — the provider must be enabled inside Supabase Auth; on a fresh self-hosted Supabase you need to configure the OAuth credentials there.
- **`Expected 3 parts in JWT; got 1`** — you accidentally used a `sb_secret_...` key where the JWT-format publishable key is required. Use the `eyJ...` value.
