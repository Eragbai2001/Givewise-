# GiveWise — web

Next.js 16 (App Router) + TypeScript. Plain CSS with design tokens, light and dark mode.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What's here

- `app/page.tsx` — the landing page, built from the sections in `components/landing/`.
- `app/globals.css` — colour tokens (light + dark), chips, buttons, shared bits.
- `app/landing.css` — landing-page layout and breakpoints (1180 / 900 / 640px).
- `components/Pip.tsx` — Pip the mascot (moods: idle, listening, researching, happy, concerned, celebrating) and `PipLogo`.
- `components/ThemeToggle.tsx` — light/dark switch; the choice is saved in the browser and the system setting is the default.
- `lib/landing-data.ts` — sample causes, charities and impact updates. Replace with real data later.
- `public/images/` — placeholder photos (marked "Illustrative photo" on the page). Swap for licensed or real photos before launch.

## Fonts

- Geist (self-hosted via the `geist` package) for all text.
- Coolvetica Compressed (`app/fonts/`) for the big landing headlines only. Check the font's licence before going live.

## Next up

`/signup`, `/login`, the Pip onboarding, and the app pages (My plan, Pip's suggestions, Discover, Impact, History, Settings).
Links to `/signup` and `/login` already exist on the landing page and will 404 until those pages are built.
