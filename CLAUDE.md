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
- Sidebar order: My plan, Discover, Urgent needs, Impact, History & receipts; then Settings. The sidebar can collapse to an icon rail (remembered in localStorage `gw-side`).
- **Decided 10 Nov:** "Pip's suggestions" is renamed **Urgent needs** (route stays `/suggestions`). Discover = build the monthly plan; Urgent needs = one-off gifts. Urgent needs fills itself on open with a fixed default search (shared, so usually served from the 6h cache); the search box is only for looking up something else. If a new search can't run (limit or web error), Pip shows its last saved result for that query, marked `stale`.

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
  - Step 2 causes include **Animals**; the "tell Pip in your own words" box is real (`words`) and shows under "Pip heard".
  - Budget presets $10/$25/$50 (max $50). Approving saves the budget as the hard limit and the split as the plan.
  - Step 6 runs **one live Pip search** (`/api/pip/search`) from causes + words + where, and `liveSplit()` builds up to 3 charities (verified get 2× the share, whole dollars, sums to the budget, real Source links). If the search fails or finds nothing, Pip says so and the button becomes "Ask Pip to search again". There is no sample split.
  - Answers are kept in `sessionStorage` (`gw-onboarding-answers`) across the PayPal redirect.
- `app/(app)/*`: the signed-in app, wrapped in `AppShell` (`components/app/AppShell.tsx`).
  - `plan`: My plan (donut, weekly check, charities and payments tables).
  - `discover`: "ask Pip" live search, picks tray, split modal.
  - `suggestions`: Pip's suggestions inbox.
  - `impact`: real totals per charity. `history`: real payments with PayPal order IDs and CSV export.
  - `settings`: 7 tabs. Shows an **"Your profile is incomplete"** notice when onboarding isn't finished.
  - `help`: placeholder.
- **Real data only (decided 10 Nov 2026).** No mock data in the signed-in app. `lib/demo-state.tsx`, `lib/plan-data.ts` and the sample catalogue were removed. Every screen reads `usePayments()` (`/api/payments/status`) and shows an honest empty state when there's nothing yet. `lib/landing-data.ts` is only for the marketing landing page.
- `app/app.css`: app shell and page styles. It uses **container queries** on `.gwapp` (1180px icon rail, 900px, 640px bottom nav).
- App pages need a login: `AppShell` sends logged-out visitors to `/login` (added Nov 2026). The API routes check the session too.

## Payments plan (BUILT, needs a Vault-enabled sandbox merchant to test end-to-end — see "Payments: what exists")

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


## Payments: what exists (Oct 2026)

- `lib/db.ts` one DB handle (Postgres via `DATABASE_URL`, else SQLite). Our tables: `gw_payment_method`, `gw_setup_token`, `gw_plan_item`, `gw_setting`, `gw_payment`, `gw_pip_cache` (created by `ensureDb()`). Money is integer cents.
- `lib/paypal.ts` Vault (setup token → payment token, redirect flow, no JS SDK) + Orders v2 with `vault_id`.
- `lib/payments.ts` the money rules. Every charge inserts a PENDING row first, then checks this month's total against the hard limit, then calls PayPal (idempotent request id). Over the limit → BLOCKED, PayPal never called. Tested.
- Routes: `POST /api/paypal/vault/start`, `GET /api/paypal/vault/return`, `GET /api/payments/status`, `POST /api/payments/{plan,run,give}`, `POST /api/paypal/webhook` (needs `PAYPAL_WEBHOOK_ID`).
- UI: onboarding step 5 really connects PayPal; step 8 saves the plan; `components/app/PaymentPanel.tsx` on My plan shows the account, a given-this-month meter and "Run payment day now" (or "<month> is done" / "Limit reached"). It no longer lists payments; it links to History & receipts.
- **Blocker found 12 Oct:** `POST /v3/vault/setup-tokens` returns `NOT_AUTHORIZED` with the current sandbox app (plain Orders work). The sandbox business account is probably not in a Vault-supported country (Nigeria isn't). Fix: create a **US** sandbox Business account, create a new REST app on it with "Save payment methods" ticked, swap `PAYPAL_CLIENT_ID/SECRET`.
- Limits: `gw_setting` is written by onboarding (the budget the donor picks becomes the hard limit) and by Settings → Budget & limits (`POST /api/settings`). Capped at **$50** (`MAX_LIMIT_CENTS`) while we test on sandbox accounts.
- "Run payment day now" skips charities already paid this month; once all are paid, My plan shows "<month> is done" instead of the button.
- A charge stuck in PENDING for 10+ minutes is marked FAILED so it stops counting against the limit (`releaseStalePending`); the COMPLETED webhook flips it back if PayPal did take it.
- Charity `payee` needs a sandbox merchant email (`PAYPAL_DEMO_PAYEE_EMAIL`). Real charities need their own PayPal merchant ids, not yet collected.

## Pip's research agent

- `lib/pip-search.ts` + `POST /api/pip/search`: **Tavily** (`TAVILY_API_KEY`, 3 basic searches = 3 credits: general + news + social/fundraiser sites via `include_domains`) finds pages, then **Claude Haiku 5.5** (`ANTHROPIC_API_KEY`, `PIP_MODEL` to override) reads them and returns charities as JSON. Switched from Opus + Claude web search on 10 Nov 2026 because that cost $0.30–0.60 a search; now about $0.01 plus Tavily's free tier (~1,000 credits/month).
- Trust rules are enforced in code: a proof link only counts if that exact URL came back from Tavily; confidence is recomputed (verified needs ≥2 domains incl. a registry/report/news source; the model can only lower it). Tested offline.
- Social posts (Instagram/X) only appear if web search indexes them. We do not scrape those platforms (ToS, and unreliable).
- **Streaming + people in need (10 Nov, decided with Jaime):** the model writes one JSON finding per line; the server checks each (`cleanItem`) and streams it (`{ stream: true }` → NDJSON), so cards appear in a few seconds (`lib/use-pip-search.ts`). Findings have `type: "charity" | "person"`. People (surgery, war victims…) come from news, GoFundMe and public X/Instagram/Threads/Facebook posts; a person with no valid link is dropped, social/fundraiser links can never count as news/registry, and social-only findings get a red flag. People get one-click **Give once** (`components/app/GiveOnce.tsx`) through the donor's PayPal, never a monthly plan (ids `live-person-…`, `savePlan` refuses them; onboarding's split skips them). Jaime's longer-term plan: people in need register on GiveWise with their own payout details (separate page), not built yet.
- Every finding is also saved per donor in `gw_found` (`rememberFound` / `foundFor` in `lib/pip-search.ts`, id from `lib/found-id.ts`). `/api/payments/status` adds `details` to each plan item, and **My plan → Your charities** shows them as cards with sources (older plan items fall back to a "Look it up on Discover" link; Discover reads `?q=`).
- While searching, `components/app/PipSearching.tsx` shows Pip, a step checklist with a spinner and skeleton cards.
- "Set up with Pip" (History empty state, My plan setup card) only shows for donors who haven't onboarded (`useOnboarded()` in `lib/onboarding.ts`); others get "Find charities with Pip" or "Go to My plan".
- Cards: `FoundCard` in `LiveSearch.tsx` (shared with `LiveAppeals.tsx`) has a "Check it yourself" sources block, website/donate/fundraiser links. Cache key prefix is `s2:`.
- Cached 6h per query (`gw_pip_cache`). New searches capped at 5/user/hour and 15/day across everyone (`PIP_HOURLY_LIMIT`, `PIP_DAILY_LIMIT`) to protect the API budget.
- UI: `components/app/LiveSearch.tsx` on Discover. Found charities can be added to picks.
- Urgent appeals: `components/app/LiveAppeals.tsx` at the top of Pip's suggestions. It asks `/api/pip/search` for charities with a current appeal, hides "Couldn't verify" ones, and "Give $X once" (after a confirm) calls `POST /api/payments/give`. Below it, an empty state says weekly suggestions are coming.
- Discover → "Approve this plan" saves the split with `POST /api/payments/plan` (live charities keep their `live-…` ids). In sandbox every gift is paid to `PAYPAL_DEMO_PAYEE_EMAIL`, and the UI says so.
- Each Pip search logs its tokens and an estimated cost to the server console. Cached repeats are free.

## Where we stopped (10 Nov 2026) — pick up here

Deadline is **12 Nov 2026**. Live: https://givewise-seven.vercel.app (deployed from commit `b26d502`, deploy succeeded).

Done on 10 Nov:
- Pip search moved to Tavily + Claude Haiku 5.5 (see "Pip's research agent"). Jaime added `TAVILY_API_KEY` in Vercel and redeployed.
- All mock data removed from the signed-in app (see "Real data only" above).
- Google sign-in "isn't set up" on the first click fixed (buttons wait for `/api/me`).

Next steps, in order:
1. **Jaime is testing the full flow from onboarding** with a fresh account: sign up as `name+test1@…` (a "+" alias = new account, same inbox). Any password with 10+ characters and a number. Check: causes → $25 budget → Connect PayPal → Pip's live search → approve split → My plan "Run payment day now" → History / Impact / Settings → PayPal show real data → Pip's suggestions "Find appeals". Fix whatever breaks.
2. **Done (10 Nov, not yet deployed):** Connect PayPal now opens PayPal in a **new tab** (`lib/paypal-connect.ts`), so the test login stays visible. The PayPal tab ends on `/paypal/done`, which tells the GiveWise tab the result (BroadcastChannel, localStorage fallback) and closes itself. If the popup is blocked, it falls back to the same-tab redirect. Used in onboarding step 5 and `PaymentPanel`. Also fixed: the research checklist spinner now spins, and "See my split" is disabled until Pip's search finishes.
3. Offered, not yet decided: a "Start over" button (Settings → Security) that clears plan, limits and PayPal connection and sends the user back to onboarding, keeping payment history. Ask Jaime.
4. **Done (10 Nov):** Next.js upgraded 16.4.0 → 16.4.6 (fixes 3 critical advisories: RCE in image optimization with SVGs, RCE in `use cache`, Server Actions DoS). `npm audit` is clean.
5. README `TODO`s: live URL (confirm), YouTube demo link, PayPal sandbox buyer login, optional GiveWise test account.
6. Demo video.

## Status (9 Nov 2026)

- Pushed to GitHub `main`; Vercel deploys from it. `ANTHROPIC_API_KEY` and `TAVILY_API_KEY` go in Vercel's environment variables only (the dev laptop is a public PC: no `.env.local` is kept on it). Needs a redeploy after adding.
- Submission checklist: MIT `LICENSE` added; README is judge-ready but still has `TODO`s (live URL, YouTube link, PayPal sandbox buyer login, optional GiveWise test account).
- Next.js is pinned to 16.4.6 (the build's security notice is gone).
- Impact shows real totals per charity from completed payments. Pip's weekly check and weekly suggestions aren't built: they show "coming" empty states.
- **Only charities Pip found (ids starting `live-`) can be in a plan or be paid.** `savePlan`, `runPaymentDay` and `giveOnce` refuse anything else (`isRealCharity` in `lib/payments.ts`). `getPlan` returns no items until a plan is saved; the PayPal card shows "Find charities with Pip" until then.
- Discover is Pip's live search only (the made-up catalogue was deleted). `lib/discover-data.ts` now only holds the `Charity` type and `hear()`.
- Log in / sign up: the Google/PayPal buttons wait for `/api/me` before deciding a provider is off (a cold Vercel start used to show "isn't set up" on the first click).
- In sandbox every gift goes to `PAYPAL_DEMO_PAYEE_EMAIL`, not the real charity. Real payouts need verified charity PayPal accounts (or PayPal Giving Fund).
