"use client";

import { useEffect, useState } from "react";
import Pip from "@/components/Pip";

const STEPS = ["Searching the web, news and public posts…", "Reading charity pages, fundraisers and posts…", "Checking every source link…", "Showing what Pip can back up…"];

/** What you see while Pip searches: Pip, what it's doing now, a thin progress bar, and placeholder cards until results arrive. */
export default function PipSearching({ found }: { found: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Moves on with time, and jumps to the last step once cards start arriving.
  const step = found > 0 ? 3 : t >= 9 ? 2 : t >= 3 ? 1 : 0;

  return (
    <div className="pipload" role="status" aria-live="polite">
      <div className="pipload-top">
        <Pip mood="researching" size={56} decorative />
        <div>
          <strong>{found ? `Found ${found} so far` : "Pip is searching"}</strong>
          <span>{STEPS[step]}</span>
        </div>
        <span className="pipload-time num">{t}s</span>
      </div>
      <div className="pipload-bar" aria-hidden="true"><i /></div>
      {found === 0 && (
        <div className="results" aria-hidden="true">
          <div className="ccard skel"><i /><i /><i /><i /></div>
          <div className="ccard skel"><i /><i /><i /><i /></div>
        </div>
      )}
    </div>
  );
}
