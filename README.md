# GiveWise

**An AI giving agent that finds charities you can trust and pays them through PayPal, only when you say yes.**

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (2026).

- **Live demo:** https://givewise-seven.vercel.app <!-- TODO: confirm this is the current deploy -->
- **Demo video:** <!-- TODO: YouTube link -->
- **License:** MIT (see [LICENSE](LICENSE))

---

## The problem

People want to give regularly, but they don’t know which charities are real, whether their money did anything, or how to keep a monthly habit going without it running away from them. Small and local charities, especially in places like Nigeria, are the hardest to check.

## What GiveWise does

Pip, a small water-droplet mascot, is the agent.

1. **You tell Pip what you care about** and pick a monthly budget. That budget becomes a **hard limit**.
2. **Pip researches charities on the live web** (Claude with web search). Every claim comes with a link, and a confidence label: **Verified**, **Partly verified** or **Couldn’t verify**.
3. **You connect PayPal once.** PayPal saves your approval. Nothing is charged by connecting.
4. **You approve a monthly split.** On payment day, GiveWise creates one PayPal order per charity, paid from your PayPal straight to the charity. GiveWise never holds the money.
5. **Pip finds urgent appeals.** If an appeal fits what you care about, Pip shows it with its sources and you can give extra once. Pip never approves anything for you.

### Trust rules, enforced in code (not just in the UI)

- **The hard limit is checked on the server before every charge** (`lib/payments.ts`). Each charge is reserved first, then checked, so two requests at once can’t both slip under the limit. Over the limit means the charge is stopped and PayPal is never called.
- **Pip can’t invent sources** (`lib/pip-search.ts`). A link only counts if that exact URL came back from the web search. The confidence label is recalculated from the links that survive, and the model can only make it lower, never higher.
- **Payment day pays each charity once a month**, and a payment that never hears back from PayPal stops counting against the limit after 10 minutes.

## How it uses PayPal and AI

| Part | What it does | Code |
|---|---|---|
| **PayPal Vault** (setup token → payment token) | “Save PayPal without paying”, approved on PayPal’s own page | `lib/paypal.ts`, `app/api/paypal/vault/*` |
| **PayPal Orders v2** with `vault_id` and `payee` | One order per charity on payment day, and one-off gifts to urgent appeals | `lib/paypal.ts`, `lib/payments.ts` |
| **PayPal webhooks** | Failed, reversed or refunded payments, and revoked approvals | `app/api/paypal/webhook/route.ts` |
| **Log in with PayPal** | Optional sign-in | `lib/auth.ts` |
| **Claude (Opus 5.5) + web search** | Researches charities and current appeals, returns proof links | `lib/pip-search.ts`, `app/api/pip/search/route.ts` |

---

## Try it (judges)

### On the live demo

1. Open the live demo and **sign up** with any email and a password (at least 10 characters, with a number).
2. Go through Pip’s setup. **Pick $25 a month** so there’s room for an extra gift later.
3. At **Connect PayPal**, log in with the PayPal sandbox test buyer below. This is fake money.
4. Approve the split. On **My plan**, press **Run payment day now**. You’ll see a PayPal order ID for each charity.
5. In **Settings → Budget & limits**, raise the limit to $50 and save.
6. Open **Pip’s suggestions** → **Find appeals**. Pip searches the web (up to a minute). Give **$10 once** to an appeal: it goes through. Then try **$25**: the server stops it because it’s over your limit.
7. On **Discover**, type a cause (for example “dog rescue in Lagos”) and press **Search the web**. Add a charity Pip found, press **Share my $…**, then **Approve this plan**.
8. **History & receipts** lists every payment with its PayPal order ID.

### Test logins

| What | Login |
|---|---|
| PayPal sandbox buyer (fake money) | Email: `TODO` · Password: `TODO` |
| GiveWise | Sign up with any email, or use: `TODO` / `TODO` |

The sandbox buyer login is also shown in the app on the **Connect PayPal** step.

> **Sandbox note:** in this demo every gift is paid to one sandbox test charity account, not to the real charity Pip found. No real money moves. In production, each charity needs its own verified PayPal account (see “What’s next”).

---

## Run it yourself

**Needs:** Node.js 22.13 or newer (it uses the built-in `node:sqlite`), and a free PayPal developer account.

```bash
git clone https://github.com/Eragbai2001/Givewise-.git
cd Givewise-
npm install
cp .env.local.example .env.local   # then fill it in (see below)
npm run dev
```

Open http://localhost:3000. The database is created automatically: a local SQLite file (`givewise.db`), or Postgres if you set `DATABASE_URL`.

### Environment variables (`.env.local`)

| Variable | Needed for | Where to get it |
|---|---|---|
| `BETTER_AUTH_SECRET` | Accounts | Any long random string (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Accounts | `http://localhost:3000`, or your public URL |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Payments | developer.paypal.com → Apps & Credentials (sandbox). Use an app on a **US** sandbox business account with **Save payment methods (Vault)** turned on |
| `PAYPAL_ENV` | Payments | `sandbox` |
| `PAYPAL_DEMO_PAYEE_EMAIL` | Payments | A sandbox **business** account email. All test gifts land here |
| `PAYPAL_TEST_BUYER_EMAIL`, `PAYPAL_TEST_BUYER_PASSWORD` | Optional | A sandbox **personal** account, shown on the Connect PayPal step |
| `PAYPAL_WEBHOOK_ID` | Optional | Your app → Webhooks, pointing at `https://<your-site>/api/paypal/webhook` |
| `ANTHROPIC_API_KEY` | Pip’s web research | console.anthropic.com → API keys |
| `PIP_MODEL` | Optional | Defaults to `claude-opus-5-5`. `claude-sonnet-5-5` costs about half |
| `PIP_HOURLY_LIMIT`, `PIP_DAILY_LIMIT` | Optional | New Pip searches allowed (defaults: 5 per person per hour, 15 a day in total) |
| `DATABASE_URL` | Optional locally, needed on Vercel | Postgres connection string (e.g. Supabase, transaction pooler) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Google sign-in |
| `RESEND_API_KEY` | Optional | Password reset emails |

Check a production build with `npx next build`.

---

## What’s real and what’s sample data

**Real:** accounts, PayPal connection, plans and limits, payment day, one-off gifts, payment history, Pip’s web research on Discover, and urgent appeals on Pip’s suggestions.

**Sample data (labelled in the app):** the built-in charity catalogue on Discover, Impact, Pip’s weekly check on My plan, the example cards on Pip’s suggestions, and the fixed three-charity split in onboarding.

## What’s next

- **Pay real charities:** charities sign up with a verified PayPal business account (or through PayPal Giving Fund), and GiveWise only ever pays a confirmed charity account, never a personal one.
- **Stronger checks:** look charities up in official registers (US tax-exempt search, UK Charity Commission, Nigeria’s CAC).
- **Nigeria:** PayPal Vault isn’t available for Nigerian merchants yet, so Nigerian donors would need a local option such as Paystack.
- **Pip’s weekly check:** run the research on a schedule and turn changes into suggestions.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · plain CSS · Better Auth · Postgres or SQLite · PayPal REST APIs · Anthropic Claude API.
