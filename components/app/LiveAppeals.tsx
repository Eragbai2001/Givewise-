"use client";

import { useEffect, useRef, useState } from "react";
import { I, Ic } from "@/components/app/icons";
import GiveOnce from "@/components/app/GiveOnce";
import PipSearching from "@/components/app/PipSearching";
import { FoundCard, toCharity } from "@/components/app/LiveSearch";
import { usePipSearch } from "@/lib/use-pip-search";

/**
 * Pip's live urgent appeals and people in need.
 * Pip researches the web (news, fundraisers, public posts) for a current need, with sources.
 * The donor picks an amount and sends one gift through PayPal. The server checks the limits first.
 */
// The page opens with this search. Everyone shares it, so it's usually served from Pip's 6-hour cache (free and instant).
const DEFAULT_Q = "urgent appeals and people in need of surgery or emergency help in Nigeria";

export default function LiveAppeals() {
  const [q, setQ] = useState(DEFAULT_Q);
  const { busy, error, res, search } = usePipSearch();
  const [hidden, setHidden] = useState<string[]>([]);

  function find(text = q) {
    setHidden([]);
    search(`Urgent appeals, emergency fundraising and individuals in urgent need right now (medical, surgery, war or disaster): ${text.trim()}`);
  }

  // Don't make the donor search: show today's urgent needs as soon as the page opens.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    find(DEFAULT_Q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only real, sourced current needs. "Couldn't verify" ones are left out: Pip won't ask you to give to those.
  const shown = (res?.results ?? []).filter(
    (f) => f.confidence !== "none" && f.need && !/^no current appeal/i.test(f.need) && !hidden.includes(toCharity(f).id),
  );
  const people = shown.filter((f) => f.type === "person");
  const appeals = shown.filter((f) => f.type !== "person");

  return (
    <section className="card" aria-labelledby="la-h" aria-busy={busy}>
      <div className="card-h">
        <h2 id="la-h">Urgent needs Pip found today</h2>
        <span className="meta">Live web research · every claim has a link</span>
      </div>
      <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label className="search" style={{ flex: "1 1 260px" }}>
            <Ic d={I.search} />
            <span className="sr-only">Look for a different kind of need</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim().length > 2 && !busy && find()} />
          </label>
          <button className="btn btn-primary" onClick={() => find()} disabled={busy || q.trim().length < 3}>
            {busy ? "Pip is searching…" : "Look for this"}
          </button>
        </div>
        {busy && <PipSearching found={res?.results.length ?? 0} />}
        {error && <p className="form-err" role="alert" style={{ margin: 0 }}>{error}</p>}

        {res && !busy && (
          <>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              {res.stale ? "Pip can’t search again right now, so this is its last check, from " : "Checked "}
              {new Date(res.searchedAt).toLocaleString()}. Anything Pip couldn’t verify is left out.
            </p>
            {shown.length === 0 && <p style={{ margin: 0 }}>I couldn’t find an open appeal I can back with sources. Try other words or a wider place.</p>}
          </>
        )}

        {appeals.map((f) => {
          const id = toCharity(f).id;
          return (
            <FoundCard key={id} f={f} urgentTag>
              <GiveOnce f={f} onHide={() => setHidden((h) => [...h, id])} />
            </FoundCard>
          );
        })}

        {people.length > 0 && (
          <>
            <h3 style={{ margin: "6px 0 0", fontSize: 15 }}>People in need</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              Personal appeals are harder to check than charities. Read the sources first.
            </p>
            {people.map((f) => {
              const id = toCharity(f).id;
              return (
                <FoundCard key={id} f={f}>
                  <GiveOnce f={f} onHide={() => setHidden((h) => [...h, id])} />
                </FoundCard>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
