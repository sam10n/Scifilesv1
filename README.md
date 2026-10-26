# SchoolVault — Supabase version (NO LOGIN, for testing)

This copy of the app uses **Supabase** as its backend (instead of Base44) and has
**no login screen** — it opens straight to the Dashboard.

> ⚠️ With no login, anyone who knows your Supabase URL can read/change/delete the
> data. Use it for testing only, not for real student records.

## 1. Supabase setup (one time)

1. Create a project at https://supabase.com and wait until it finishes setting up.
2. **Storage → New bucket** → name it exactly `school-files` → turn **Public bucket** ON → Create.
3. **SQL Editor → New query** → paste the whole of `supabase_schema.sql` → **Run**.
   (Safe to run again later, including on a project you set up with an older version.)
4. **Project Settings → API** → copy the **Project URL** and the **anon public** key.

## 2. Connect the app

Copy `.env.example` to a new file named `.env.local` (same folder as `package.json`) and fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run it

```
npm install
npm run dev
```

Open the **Local** address it prints. To try it on a phone on the same WiFi, open the
**Network** address instead. (Phone browsers block the camera on plain `http://` addresses,
so Scan / QR pages need an HTTPS address — e.g. after deploying.)

## 4. Deploy to Render (Static Site)

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Redirects/Rewrites: source `/*` → destination `/index.html` → action **Rewrite**
- On GitHub, upload the **contents** of this folder (so `index.html` and `src/` sit at the top
  level of the repo) — but not `node_modules`, `dist` or `.env.local`.

## What changed from the Base44 export

- Base44's backend was replaced by `src/lib/supabaseClient.js` (the only file that talks to Supabase).
- `src/lib/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`, `src/App.jsx` and
  `src/pages/Register.jsx` were rewritten for Supabase / no login.
- Base44-only files were removed; the files the export forgot to include
  (`dropdown-menu.jsx`, `query-client.js`, `ResetPassword.jsx`) were added back.
- The stray `const db = ...` line that was pasted at the top of `index.html` was removed.
