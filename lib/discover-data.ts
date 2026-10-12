// Sample charity catalogue for Discover. Replace with search results from the API.
export type Ver = "v" | "p" | "n";
export type Charity = {
  id: string;
  name: string;
  ini: string;
  cause: "water" | "edu" | "food" | "health" | "local";
  causeLabel: string;
  place: string;
  region: "ng" | "af";
  ver: Ver;
  funded?: boolean;
  tint: string;
  ink: string;
  color: string;
  outcome?: string;
  outcomeVer?: "v" | "p";
  src?: string;
};

export const CATALOG: Charity[] = [
  { id: "cs", name: "ClearSpring Water Initiative", ini: "CS", cause: "water", causeLabel: "Clean water", place: "Ghana & Nigeria", region: "ng", ver: "v", funded: true, tint: "var(--t-cs)", ink: "var(--i-cs)", color: "var(--s1)", outcome: "About $4 gives one person clean water for a year.", outcomeVer: "p", src: "ClearSpring 2025 report" },
  { id: "bf", name: "Bright Futures Scholarship Fund", ini: "BF", cause: "edu", causeLabel: "Girls’ education", place: "Kano & Kaduna, Nigeria", region: "ng", ver: "v", tint: "var(--t-bf)", ink: "var(--i-bf)", color: "var(--s2)", outcome: "$120 keeps one girl in secondary school for a term.", outcomeVer: "v", src: "Audited accounts 2025" },
  { id: "rl", name: "Roots Local Aid", ini: "RL", cause: "local", causeLabel: "Local & community", place: "Lagos, Nigeria", region: "ng", ver: "n", tint: "var(--t-rl)", ink: "var(--i-rl)", color: "var(--s3)" },
  { id: "ht", name: "Harvest Table Food Network", ini: "HT", cause: "food", causeLabel: "Food relief", place: "Lagos & Abuja, Nigeria", region: "ng", ver: "v", tint: "var(--accent-soft)", ink: "var(--accent-ink)", color: "var(--s4)", outcome: "About $0.40 provides one hot meal for a family member.", outcomeVer: "p", src: "Harvest Table 2025 report" },
  { id: "nl", name: "Northern Lights Girls’ Mentorship", ini: "NL", cause: "edu", causeLabel: "Girls’ education", place: "Northern Nigeria", region: "ng", ver: "p", tint: "var(--grey-soft)", ink: "var(--grey-ink)", color: "#8C7A5B" },
  { id: "rr", name: "ReadRight Community Libraries", ini: "RR", cause: "edu", causeLabel: "Literacy", place: "Oyo & Ogun, Nigeria", region: "ng", ver: "v", tint: "var(--grey-soft)", ink: "var(--grey-ink)", color: "#6B8F71", outcome: "$2 puts one book on a shared library shelf.", outcomeVer: "p", src: "ReadRight 2025 report" },
  { id: "bh", name: "Blue Horizon Water Trust", ini: "BH", cause: "water", causeLabel: "Clean water", place: "East Africa", region: "af", ver: "v", tint: "var(--grey-soft)", ink: "var(--grey-ink)", color: "#5E7FA3", outcome: "About $4.10 a year serves one person with clean water.", outcomeVer: "p", src: "2025 impact report" },
  { id: "mc", name: "MamaCare Clinics", ini: "MC", cause: "health", causeLabel: "Maternal health", place: "Enugu, Nigeria", region: "ng", ver: "p", tint: "var(--grey-soft)", ink: "var(--grey-ink)", color: "#A06A5A", outcome: "$25 covers one safe-delivery kit.", outcomeVer: "p", src: "MamaCare annual review" },
];

export const CAUSE_FILTERS = [
  ["all", "All causes"],
  ["edu", "Education"],
  ["food", "Food relief"],
  ["water", "Clean water"],
  ["health", "Health"],
  ["local", "Local & community"],
] as const;

/** Why Pip weights each charity the way it does. */
export const PIP_REASONS: Record<string, [string, string, string]> = {
  cs: ["Current project is fully funded. Less for now, more when the next one starts.", "neutral", "Project funded"],
  bf: ["Clearest checked results of your picks.", "ok", "Verified"],
  rl: ["Small local group I couldn’t fully check. Kept small.", "conf-n", "Couldn’t verify"],
  ht: ["Verified, and matches “food for families”.", "ok", "Verified"],
};

/** Reads causes and places out of a free-text search, the way Pip "hears" it. */
export function hear(q: string) {
  const t = q.toLowerCase();
  const heard: string[] = [];
  const causes: string[] = [];
  if (/girl|educat|school|literac|read/.test(t)) { heard.push("Education"); causes.push("edu"); }
  if (/food|hunger|meal|feed/.test(t)) { heard.push("Food relief"); causes.push("food"); }
  if (/water|well|borehole/.test(t)) { heard.push("Clean water"); causes.push("water"); }
  if (/health|clinic|mother|maternal|hospital/.test(t)) { heard.push("Health"); causes.push("health"); }
  if (/local|community|lagos/.test(t)) { heard.push("Local & community"); causes.push("local"); }
  let region: "" | "ng" = "";
  if (/nigeria|lagos|abuja|kano/.test(t)) { heard.push("Nigeria"); region = "ng"; }
  return { heard, causes, region };
}
