# GiveWise — project handoff

Read this first. It's the shared context from the design + front-end phase (built in Claude Cowork). The owner is Jaime (Lagos, Nigeria). We're building this for the **PayPal AI Hackathon** — submissions close **12 Nov 2026**. Prize categories we're aiming at: Best Use of PayPal + AI, Most Impactful, Best Demo.

## What GiveWise is

An AI giving agent. Pip — a water-droplet mascot — finds and verifies charities, proposes a monthly split of the donor's budget, and runs recurring donations through PayPal. Pip suggests; only the user approves.

### Trust rules (non-negotiable — apply to every screen and API)

- Every claim about a charity shows a **source** and a confidence label: **Verified**, **Partly verified**, or **Couldn't verify**.
- **Nothing moves without the user's approval.** Pip never approves anything and never pressures.
- The **spending limit is always visible** (sidebar card; strip under the top bar when the sidebar is a rail or on mobile).
- **The hard limit is enforced on the server before every charge**, not just in the UI.
- GiveWise **never holds money**. Payments go from the donor's PayPal straight to each charity.
- Respect reduced motion. Calm notifications (at most one nudge a day).
- Plain, human copy. No corporate tone.

### Product decisions already made

- Pip's suggestion types: **urgent appeal** ("give extra once" only — no redirecting the monthly plan), **need met** (move money temporarily), **match** (e.g. 2× match), **trust** (e.g. pause while a registration is renewed), **your change**.
- No Pip on the log in / sign up pages (copy there is about charity). Onboarding uses Pip.
- Pip's face is the logo (`PipLogo` in `components/Pip.tsx`).
- No visible scrollbars, no horizontal scrolling anywhere.
- Sidebar order: My plan, Discover, Pip's suggestions, Impact, History & receipts; then Settings. The sidebar can collapse to an icon rail (remembered in localStorage `gw-side`).
- Open question (not decided yet): fold Pip's suggestions into Discover? Ask Jaime before changing.

## Stack

- **Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript.** Plain CSS, no Tailwind.
- Fonts: Geist (`geist` package, `--font-geist-sans`), Coolvetica Compressed (`app/fonts/`, `--font-display`).
- Theme: `data-theme="light|dark"` on `<html>`, tokens in `app/globals.css`, set before first paint by an inline script in `app/layout.tsx` (localStorage `gw-theme`, else the system setting). `ThemeToggle` and Settings → Appearance both change it and fire a `gw-theme` window event.
- **Auth: Better Auth** (`lib/auth.ts`, route `app/api/auth/[...all]/route.ts`, client `lib/auth-client.ts`).
  - Database: **Postgres on Supabase** when `DATABASE_URL` is set (required on Vercel, which has no persistent disk); otherwise Node's built-in SQLite (`node:sqlite`, Node ≥ 22.13) in `givewise.db`. Tables are created automatically on first use (`ensureDb()`). Don't use `better-sqlite3`: Jaime's npm blocks native install scripts.
  - Email + password works now (min 10 characters).
  - Google and "Log in with PayPal" switch on automatically when their keys are in `.env.local` (see `.env.local.example`). Account linking is on, so the same email equals one account.
  - `user.onboarded` (boolean) is an extra field. `GET /api/me` returns `{ user, providers }`; `POST /api/me` marks onboarding done.
  - `trustedOrigins` allows `localhost:3000–3009`.
  - "Log in with PayPal" needs a public HTTPS return URL (ngrok or a deploy). Google works on localhost with redirect URI `http://localhost:3000/api/auth/callback/google`.
- Run: `npm install && npm run dev`. Check changes with `npx next build`.

## Layout of the code

- `app/page.tsx` + `components/landing/*`, `app/landing.css`: marketing landing page (based on the AidEase template, with scroll and reveal animations).
- `app/login`, `app/signup`, `components/auth/AuthScreen.tsx`, `app/auth.css`: real auth via Better Auth.
  - Sign up always goes to onboarding.
  - Log in goes to onboarding if `onboarded` is false, otherwise `/plan`.
  - `app/auth/continue` is where Google/PayPal sign-ins land; it routes the same way.
- `app/onboarding`, `components/onboarding/OnboardingFlow.tsx`: 9 steps with Pip. The last step calls `markOnboarded()` (`lib/onboarding.ts`). "Finish later" goes to `/plan` without marking.
- `app/(app)/*`: the signed-in app, wrapped in `DemoStateProvider` then `AppShell` (`components/app/AppShell.tsx`).
  - `plan`: My plan (donut, weekly check, charities and payments tables).
  - `discover`: catalogue, cause filters, "ask Pip" search, picks tray, split modal.
  - `suggestions`: Pip's suggestions inbox.
  - `impact`, `history`: receipts table with CSV export.
  - `settings`: 7 tabs. Shows an **"Your profile is incomplete"** notice when onboarding isn't finished.
  - `help`: placeholder.
- `lib/*-data.ts`: **mock data**. `lib/demo-state.tsx` lets every page be viewed as `full | new | empty` (`?state=` or the dev-only "Data" switcher). Keep the empty/new states working when wiring real data.
- `app/app.css`: app shell and page styles. It uses **container queries** on `.gwapp` (1180px icon rail, 900px, 640px bottom nav).
- App pages are deliberately **not** login-protected yet (Jaime wanted to click around freely). Add a guard only when he says so.

## Payments plan (next big piece — agreed with Jaime)

Use **PayPal Vault (save payment method) + Orders v2**, not the Subscriptions API. A Subscription has a fixed price per plan, but GiveWise amounts change: split changes, one-off urgent gifts, temporary moves.

1. **Onboarding → "Approve and connect PayPal":** the JS SDK "save without purchase" flow (setup token → payment token). Nothing is charged. Store the vault/payment token on the user.
2. **Database:** users, plans, plan_items (charity, amount, start/end), payment_methods (vault token), payments (receipts), suggestions.
3. **Payment day (scheduled job):**
   - Read the plan items.
   - **Check the total ≤ the user's hard limit.**
   - For each charity, create an Orders v2 order with the vault id and `purchase_units[].payee` = the charity's PayPal merchant/email, so money goes straight to the charity. Then capture it and save a receipt.
4. **Approving a Pip suggestion** only changes plan rows. No new PayPal approval is needed.
5. **Urgent appeal "Send $25 now"** is one immediate order with the same token, checked against the one-off limit.
6. **Webhooks** handle failed payments, which trigger the always-on "Payment problems" alert (retry, then notify).
7. Add a **"Run payment day now"** button for the demo so judges don't have to wait a month.

Facts checked (Oct 2026):

- Vault works in sandbox (enable **Vault** under Advanced options in the sandbox app).
- Saving **cards** needs Expanded Checkout and PCI SAQ D. Guest card subscriptions are US/CA only.
- Vault isn't available for Nigerian merchants. For Nigerian users later, add Paystack (saved card / NIBSS direct debit mandate). Be honest about this in the pitch.
- Use one PayPal sandbox app for both Log in with PayPal and payments.

After payments: Pip's AI (Claude API for chat and charity checks). Then a motion-graphics demo video (done in Cowork).

## Working style Jaime likes

- Direct, opinionated recommendations. Short explanations in plain language.
- Ask before big product changes. Small fixes: just do them.
- Keep the design consistent with what's there (tokens in `globals.css`, existing classes in `app.css`). Check light and dark, desktop and phone.
