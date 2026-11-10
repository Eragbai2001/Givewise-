// Shapes used by Discover for charities Pip found on the web.
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


export const CAUSE_FILTERS = [
  ["all", "All causes"],
  ["edu", "Education"],
  ["food", "Food relief"],
  ["water", "Clean water"],
  ["health", "Health"],
  ["local", "Local & community"],
] as const;


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
