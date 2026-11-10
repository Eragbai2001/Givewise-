"use client";

import { useEffect, useRef } from "react";
import { I, Ic } from "@/components/app/icons";
import PipSearching from "@/components/app/PipSearching";
import { FoundCard, toCharity } from "@/components/app/LiveSearch";
import type { Charity } from "@/lib/discover-data";
import { usePipSearch } from "@/lib/use-pip-search";

// Everyone opens Discover with this search, so it's usually served from Pip's 6-hour cache (free and instant).
const SUGGEST_Q = "Trustworthy charities for clean water, girls’ education and health in Nigeria";
const TRY = ["Clean water in Nigeria", "Girls’ education in Kano", "Rescue dogs in Lagos", "Food banks in Abuja"];

type Props = { picks: string[]; onFound: (found: Charity[]) => void; onToggle: (id: string) => void; onTry: (q: string) => void };

/** Discover before you type: charities Pip already checked, ready to add to your picks. */
export default function PipSuggested({ picks, onFound, onToggle, onTry }: Props) {
  const { busy, error, res, search } = usePipSearch();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    search(SUGGEST_Q).then((r) => r && onFound(r.results.filter((f) => f.type !== "person").map(toCharity)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only charities Pip could back with a source. People in need live on Urgent needs.
  const shown = (res?.results ?? []).filter((f) => f.type !== "person" && f.confidence !== "none");

  return (
    <section className="card" aria-labelledby="sug-h" aria-busy={busy}>
      <div className="card-h">
        <h2 id="sug-h">Suggested by Pip</h2>
        <span className="meta">Checked charities · every claim has a link</span>
      </div>
      <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="sug-try">
          <span>Or search for something you care about:</span>
          {TRY.map((t) => (
            <button key={t} className="fchip" onClick={() => onTry(t)}>{t}</button>
          ))}
        </div>

        {busy && <PipSearching found={res?.results.length ?? 0} />}
        {error && !shown.length && <p className="form-err" role="alert" style={{ margin: 0 }}>{error}</p>}
        {res && !busy && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            {res.stale ? "Pip’s last check, from " : "Checked "}
            {new Date(res.searchedAt).toLocaleString()}. Pip suggests, you decide. Check the links before you give.
          </p>
        )}

        {shown.length > 0 && (
          <div className="results">
            {shown.map((f) => {
              const c = toCharity(f);
              const on = picks.includes(c.id);
              return (
                <FoundCard key={c.id} f={f} picked={on}>
                  <div className="foot2">
                    <span />
                    {busy ? (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>You can add it when Pip is done</span>
                    ) : (
                      <button className={`btn btn-sm ${on ? "added" : ""}`} onClick={() => onToggle(c.id)} aria-pressed={on}>
                        <Ic d={on ? I.check : ["M12 5v14", "M5 12h14"]} />
                        {on ? "Picked" : "Add to picks"}
                      </button>
                    )}
                  </div>
                </FoundCard>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
