/** Stable id for something Pip found. Shared by the browser and the server so both agree. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// People in need get their own prefix: the server lets them have one-off gifts, never a monthly plan.
export const foundId = (f: { type?: string; name: string }) => `live-${f.type === "person" ? "person-" : ""}${slug(f.name)}`;
