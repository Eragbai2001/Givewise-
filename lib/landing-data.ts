// Sample content for the landing page. Swap for real data when the API is ready.

export type Confidence = { label: "Verified" | "Partly verified" | "Couldn’t verify"; chip: "ok" | "rev" | "none" };

export const VERIFIED: Confidence = { label: "Verified", chip: "ok" };
export const PARTLY: Confidence = { label: "Partly verified", chip: "rev" };
export const UNVERIFIED: Confidence = { label: "Couldn’t verify", chip: "none" };

export const causes = [
  { id: "water", label: "Clean water", img: "/images/water-tap.jpg", alt: "A child cupping clean water from a tap", note: "$25 a month can help keep a village well running. Pip checks each project’s reports." },
  { id: "girls", label: "Girls’ education", img: "/images/schoolgirls.jpg", alt: "Two schoolgirls laughing", note: "School fees, books and uniforms. Pip looks for exam results and term reports." },
  { id: "health", label: "Health", img: "/images/health-worker.jpg", alt: "A health worker with a young boy", note: "Clinics, community health workers and urgent medical appeals, checked with hospitals." },
  { id: "hunger", label: "Hunger", img: "/images/apples-hd.jpg", alt: "A girl receiving a box of fresh fruit", note: "Food banks and school meals. Pip checks how many meals are really served." },
  { id: "local", label: "Your community", img: "/images/pantry-hd.jpg", alt: "Volunteers sorting donations in a pantry", note: "Groups close to home, with a lighter check when they’re small. Pip tells you which." },
] as const;

export const charities = [
  { name: "ClearSpring Water Initiative", img: "/images/water-tap.jpg", alt: "Child at a water tap", raised: 24000, goal: 24000, conf: VERIFIED },
  { name: "Bright Futures Scholarship Fund", img: "/images/schoolgirls.jpg", alt: "Schoolgirls laughing", raised: 8203, goal: 15000, conf: VERIFIED },
  { name: "Harvest Table Food Bank", img: "/images/apples-hd.jpg", alt: "Girl receiving fruit", raised: 5120, goal: 12000, conf: PARTLY },
];

export const updates = [
  {
    title: "Borehole repaired outside Tamale. About 400 people use it every day.",
    body: "ClearSpring shared photos and a field report. Pip matched it with a local news story, but the daily number comes from the charity alone.",
    conf: PARTLY,
    src: "ClearSpring field update",
    when: "3 weeks ago",
    img: "/images/boxdesk-hd.jpg",
    alt: "Donated supplies being packed",
  },
  {
    title: "9 in 10 Bright Futures scholars passed their junior exams.",
    body: "The charity published results by school. Pip checked two of the schools’ own reports.",
    conf: VERIFIED,
    src: "Bright Futures results",
    when: "2 days ago",
    img: "/images/schoolgirls.jpg",
    alt: "Schoolgirls laughing",
  },
  {
    title: "Roots Local Aid hasn’t sent an update yet.",
    body: "We asked. Anything they share will show up here with a label, and Pip won’t guess in the meantime.",
    conf: UNVERIFIED,
    src: "Request sent 4 Oct",
    when: "5 days ago",
    img: "/images/hands-hd.jpg",
    alt: "Volunteers putting their hands together",
  },
];

export const steps = [
  { n: "01", title: "Tell Pip what you care about", body: "Pick causes like clean water or girls’ education, where to give, and a monthly budget with a hard limit." },
  { n: "02", title: "Pip checks the charities", body: "Pip reads registries and reports, then suggests a split. Every claim has a source and a confidence label." },
  { n: "03", title: "You approve in PayPal", body: "Nothing moves until you say yes. Payments go from your PayPal straight to each charity." },
  { n: "04", title: "See what it did", body: "Impact updates, receipts and a year-end statement. Pip suggests changes, and you decide." },
];

export const usd = (n: number) => "$" + n.toLocaleString("en-US");
