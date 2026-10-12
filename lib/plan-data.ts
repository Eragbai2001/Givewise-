// Sample data for My plan. Replace with API data later.
export const charities = [
  { id: "cs", ini: "CS", name: "ClearSpring Water Initiative", short: "ClearSpring", cause: "Clean water", amount: 25, since: "10 Jun 2026", status: { label: "Project funded", chip: "neutral" }, checked: "7 Oct 2026", color: "var(--s1)", tint: "var(--t-cs)", ink: "var(--i-cs)" },
  { id: "bf", ini: "BF", name: "Bright Futures Scholarship Fund", short: "Bright Futures", cause: "Girls’ education", amount: 15, since: "10 Jun 2026", status: { label: "Healthy", chip: "ok" }, checked: "7 Oct 2026", color: "var(--s2)", tint: "var(--t-bf)", ink: "var(--i-bf)" },
  { id: "rl", ini: "RL", name: "Roots Local Aid", short: "Roots Local Aid", cause: "Water & schooling", amount: 10, since: "10 Jun 2026", status: { label: "Healthy", chip: "ok" }, checked: "7 Oct 2026", color: "var(--s3)", tint: "var(--t-rl)", ink: "var(--i-rl)" },
];

export const MONTHLY_LIMIT = 50;

const months = ["1 Oct 2026", "1 Sep 2026", "1 Aug 2026", "1 Jul 2026", "10 Jun 2026"];
const refs = ["7Q2K-10", "6M8P-09", "5R3T-08", "4H6W-07", "3D9X-06"];
export const payments = months.flatMap((date, mi) =>
  charities.map((c, ci) => ({ date, name: c.name, ref: `SBX-${refs[mi]}0${ci + 1}`, amount: c.amount }))
);
