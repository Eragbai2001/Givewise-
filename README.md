# GiveWise

**Millions need help right now, but finding them takes time. GiveWise's AI agent Pip searches the web and social media like X and Instagram for urgent needs and pays them via PayPal, within your limit.**

- **Live demo:** https://givewithpip.com <sub>(backup: https://givewise-seven.vercel.app)</sub>
- **Demo video:** https://www.youtube.com/watch?v=RRdwWZVbo1c
- **License:** MIT (see [LICENSE](LICENSE))

---

## The problem

People want to help, but they don’t know which charities are real, whether their money did anything, or how to keep giving every month without it getting out of hand. Small and local causes, especially in places like Nigeria, are the hardest to check. And when someone needs help right now, finding them in time is hard.

## What GiveWise does

Pip, a small water-droplet character, is the agent. Pip suggests; you decide.

1. **You tell Pip what you care about** and pick a monthly budget. That budget becomes a **hard limit**.
2. **Pip researches on the live web.** It searches web pages, news, fundraisers and public social media posts, then reads them. Every claim comes with a link and a label: **Verified**, **Partly verified** or **Couldn’t verify**.
3. **You connect PayPal once.** PayPal saves your approval. Connecting doesn’t charge anything.
4. **You approve a monthly split** between the charities Pip found.
5. **You press “Run payment day now”** on My plan. GiveWise creates one PayPal payment per charity, from your PayPal straight to the charity. GiveWise never holds the money.
6. **Pip finds urgent needs:** current appeals and people in need (for example someone who needs surgery). Each one shows its sources, and you can give once with one click. Pip never approves anything for you.

### Safety rules, enforced in code (not just on screen)

- **Your limit is checked on the server before every payment** (`lib/payments.ts`). Each payment is reserved first, then checked, so two payments at the same moment can’t both slip under the limit. If a payment would go over, it’s stopped and PayPal is never called.
- **Pip can’t make up sources** (`lib/pip-search.ts`). A link only counts if that exact page came back from the web search. The label is worked out again from the links that are left, and the AI can only lower it, never raise it.
- **Social media posts can’t count as proof on their own.** A finding backed only by social posts or fundraiser pages is marked with a warning, and a person in need with no valid link is dropped.
- **Each charity is paid once a month.** A payment that never hears back from PayPal stops counting against your limit after 10 minutes.

## How it uses PayPal and AI

| Part | What it does | Code |
|---|---|---|
| **PayPal Vault** (setup token → payment token) | Saves your PayPal without paying, approved on PayPal’s own page | `lib/paypal.ts`, `app/api/paypal/vault/*` |
| **PayPal Orders v2** with `vault_id` and `payee` | One payment per charity on payment day, and one-off gifts | `lib/paypal.ts`, `lib/payments.ts` |
| **PayPal webhooks** | Failed, reversed or refunded payments, and cancelled approvals | `app/api/paypal/webhook/route.ts` |
| **Log in with PayPal** | Optional sign-in | `lib/auth.ts` |
| **Tavily search + Claude (Haiku 5.5)** | Tavily finds web pages, news, fundraisers and public posts on X, Instagram, Threads, Facebook, TikTok and GoFundMe. Claude reads them and sends back charities, current appeals and people in need, each with proof links, as they’re found | `lib/pip-search.ts`, `app/api/pip/search/route.ts` |

---

## Try it

### On the live demo

1. Open the live demo and **sign up** with any email (password: at least 10 characters, with a number) or with Google.
2. Go through Pip’s setup. **Pick $25 a month** so there’s room for an extra gift later.
3. At **Connect PayPal**, log in with the PayPal sandbox test buyer below. This is fake money.
4. Approve the split. On **My plan**, press **Run payment day now**. You’ll see a PayPal order ID for each charity.
5. In **Settings → Budget & limits**, raise the limit to $50 and save.
6. Open **Urgent needs**. Pip fills it with live appeals and people in need as soon as it opens (or type another need and press **Look for this**). Give **$10 once**: it goes through. Then try **$25**: the server stops it because it’s over your limit.
7. On **Discover**, type a cause (for example “dog rescue in Lagos”) and press **Search the web**. Add a charity Pip found, press **Share my $…**, then **Approve this plan**.
8. **History & receipts** lists every payment with its PayPal order ID. **Impact** shows how much went to each charity.

### Test logins

| What | Login |
|---|---|
| PayPal sandbox buyer (fake money) | Email: `sb-9qcv4353330482@personal.example.com` · Password: `c$h2JwP/` |
| GiveWise | Sign up with any email or Google |

The sandbox buyer login is also shown in the app on the **Connect PayPal** step.

> **Test mode note:** right now every gift is paid to one PayPal sandbox test account, not to the real charity Pip found. No real money moves. To pay real charities, each one needs its own verified PayPal account (see “What’s next”).

---

## Run it yourself

**You need:** Node.js 22.13 or newer (it uses the built-in `node:sqlite`), and a free PayPal developer account.

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
| `TAVILY_API_KEY` | Pip’s web research | app.tavily.com (free plan: about 1,000 credits a month; each search uses 3) |
| `ANTHROPIC_API_KEY` | Pip’s web research | console.anthropic.com → API keys |
| `PIP_MODEL` | Optional | Defaults to `claude-haiku-5-5` (about $0.01 a search) |
| `PIP_HOURLY_LIMIT`, `PIP_DAILY_LIMIT` | Optional | New Pip searches allowed (defaults: 5 per person per hour, 15 a day in total) |
| `DATABASE_URL` | Optional locally, needed on Vercel | Postgres connection string (e.g. Supabase, transaction pooler) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Google sign-in |
| `RESEND_API_KEY` | Optional | Password reset emails |

Check a production build with `npx next build`.

---

## What’s real

**Real:** accounts, PayPal connection, plans and limits, payment day, one-off gifts, payment history, impact totals, Pip’s web research on Discover, and urgent appeals and people in need on Urgent needs.

**No sample data.** Every charity in the app was found by Pip on the live web, and every number comes from your real plan and PayPal payments. Pip’s weekly check and impact reports aren’t built yet, so those sections say “coming” instead of showing made-up examples.

## What’s next

- **Pay real charities:** charities sign up with a verified PayPal business account (or through PayPal Giving Fund), and GiveWise only ever pays a confirmed charity account.
- **Let people in need sign up** with their own payout details, so gifts can reach them directly.
- **Stronger checks:** look charities up in official registers (US tax-exempt search, UK Charity Commission, Nigeria’s CAC).
- **Nigeria:** PayPal Vault isn’t available for Nigerian merchants yet, so Nigerian donors would need a local option such as Paystack.
- **Automatic payment day and Pip’s weekly check:** run them on a schedule instead of by button, and turn changes into suggestions.

## Built with

Next.js 16 (App Router) · React 19 · TypeScript · plain CSS · Better Auth · Postgres or SQLite · PayPal REST APIs · Tavily search API · Anthropic Claude API.
