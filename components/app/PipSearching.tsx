"use client";

import { useEffect, useState } from "react";
import Pip from "@/components/Pip";
import { I, Ic } from "@/components/app/icons";

const STEPS = ["Searching the web, news and public posts", "Reading charity pages, fundraisers and posts", "Checking every source link", "Showing what Pip can back up"];

/** What you see while Pip searches: Pip at work, the steps ticking along, and placeholder cards until results arrive. */
export default function PipSearching({ found }: { found: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Steps move on with time, and jump ahead once cards start arriving. The last one finishes when the search does.
  const step = Math.min(found > 0 ? 3 : 2, Math.max(t >= 9 ? 2 : t >= 3 ? 1 : 0, found > 0 ? 3 : 0));

  return (
    <div className="pipload" role="status" aria-live="polite">
      <div className="pipload-top">
        <Pip mood="researching" size={64} decorative />
        <div>
          <strong>{found ? `Found ${found} so far. Pip is still checking…` : "Pip is searching…"}</strong>
          <span>{t < 60 ? `${t}s · usually 10 to 30 seconds` : `${t}s · nearly there`}</span>
        </div>
      </div>
      <ol className="pipload-steps">
        {STEPS.map((s, i) => {
          const st = i < step ? "ok" : i === step ? "go" : "wait";
          return (
            <li key={s} className={st}>
              <span className={`st ${st}`} aria-hidden="true">{st === "ok" && <Ic d={I.check} />}</span>
              {s}
            </li>
          );
        })}
      </ol>
      {found === 0 && (
        <div className="results" aria-hidden="true">
          <div className="ccard skel"><i /><i /><i /><i /></div>
          <div className="ccard skel"><i /><i /><i /><i /></div>
        </div>
      )}
    </div>
  );
}
