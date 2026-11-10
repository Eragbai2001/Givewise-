"use client";

import { useState, type ReactNode } from "react";
import PipSearching from "@/components/app/PipSearching";
import { I, Ic } from "@/components/app/icons";
import GiveOnce from "@/components/app/GiveOnce";
import type { Charity } from "@/lib/discover-data";
import type { FoundCharity } from "@/lib/pip-search";
import { usePipSearch } from "@/lib/use-pip-search";
import { foundId } from "@/lib/found-id";

type Props = {
  query: string;
  picks: string[];
  onFound: (found: Charity[]) => void;
  onToggle: (id: string) => void;
};

export const KIND_LABEL: Record<string, string> = { registry: "Registry", report: "Report", news: "News", official: "Official site", social: "Social post", other: "Source" };

function causeOf(text: string): Charity["cause"] {
  const t = text.toLowerCase();
  if (/water|well|sanit/.test(t)) return "water";
  if (/educat|school|literac|girl|scholar/.test(t)) return "edu";
  if (/food|hunger|meal|feed/.test(t)) return "food";
  if (/health|clinic|medic|mother|maternal|hospital/.test(t)) return "health";
  return "local";
}

/** Turn a researched charity into the shape the picks tray and split already understand. */
export function toCharity(f: FoundCharity): Charity {
  const words = f.name.split(/\s+/).filter(Boolean);
  const best = f.proofs[0];
  return {
    id: foundId(f),
    name: f.name,
    ini: (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase(),
    cause: causeOf(`${f.cause} ${f.what}`),
    causeLabel: f.cause || "Charity",
    place: f.place || "Place not found",
    region: /nigeria|lagos|abuja|kano/i.test(f.place) ? "ng" : "af",
    ver: f.confidence === "verified" ? "v" : f.confidence === "partial" ? "p" : "n",
    tint: "var(--grey-soft)",
    ink: "var(--grey-ink)",
    color: "#5E7FA3",
    outcome: f.what || undefined,
    outcomeVer: f.confidence === "verified" ? "v" : "p",
    src: best?.domain,
  };
}

/** One finding (charity or person in need) with its sources. `children` is the action area at the bottom. */
export function FoundCard({ f, picked, urgentTag, children }: { f: FoundCharity; picked?: boolean; urgentTag?: boolean; children?: ReactNode }) {
  const c = toCharity(f);
  const person = f.type === "person";
  return (
    <article className={`ccard ${picked ? "picked" : ""}`} aria-label={f.name}>
      <div className="top">
        <span className="logo-ph" style={{ background: person ? "var(--red-soft)" : c.tint, color: person ? "var(--red-ink)" : c.ink }}>{c.ini}</span>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <h3>{f.name}</h3>
          <span className="loc">{f.place || "Place not found"}</span>
        </div>
      </div>
      <div className="ccard-tags">
        {person ? <span className="ttag urg">Person in need</span> : urgentTag && <span className="ttag urg">Urgent appeal</span>}
        {f.confidence === "verified" && <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Verified</span>}
        {f.confidence === "partial" && <span className="chip rev"><i />Partly verified</span>}
        {f.confidence === "none" && <span className="chip conf-n">Couldn’t verify</span>}
        {f.cause && <span className="chip neutral">{f.cause}</span>}
      </div>
      {f.what && <p style={{ margin: 0 }}>{f.what}</p>}
      <div className="outcome" style={{ alignItems: "flex-start" }}>
        <span><b>Right now:</b> {f.need || "No current appeal found"}</span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{f.confidenceReason}</p>
      {f.redFlags.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--red-ink)" }}>
          {f.redFlags.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
      <div className="verify">
        <span className="verify-h"><Ic d={I.shield} />Check it yourself</span>
        {f.proofs.length > 0 ? (
          <ul className="ev">
            {f.proofs.map((p) => (
              <li key={p.url}>
                {p.note && <span>{p.note}</span>}
                <div className="row">
                  <span className="chip neutral">{KIND_LABEL[p.kind] ?? "Source"}</span>
                  <a className="src" href={p.url} target="_blank" rel="noopener noreferrer">{p.title} ↗</a>
                  <span className="date">{p.domain}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>No sources I can show you.</p>
        )}
        {(f.website || f.donateUrl) && (
          <div className="verify-links">
            {f.website && <a className="src" href={f.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}
            {f.donateUrl && <a className="src" href={f.donateUrl} target="_blank" rel="noopener noreferrer">{person ? "Their fundraiser ↗" : "Donate page ↗"}</a>}
          </div>
        )}
      </div>
      {children}
    </article>
  );
}

/** "Ask Pip": live web research. Cards appear as Pip checks them. Every claim carries links the donor can open. */
export default function LiveSearch({ query, picks, onFound, onToggle }: Props) {
  const { busy, error, res, search } = usePipSearch();
  const [asked, setAsked] = useState("");

  const q = query.trim();
  if (q.length < 3 && !res && !busy) return null;

  async function ask() {
    setAsked(q);
    const final = await search(q);
    // Only charities go to the picks tray. People in need get one-off gifts on their card.
    if (final) onFound(final.results.filter((f) => f.type !== "person").map(toCharity));
  }

  const charities = (res?.results ?? []).filter((f) => f.type !== "person");
  const people = (res?.results ?? []).filter((f) => f.type === "person");

  return (
    <section className="card" aria-labelledby="live-h" aria-busy={busy}>
      <div className="card-h">
        <h2 id="live-h">Ask Pip to search the web</h2>
        <span className="meta">Live · every claim has a link</span>
      </div>
      <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!busy && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={ask} disabled={q.length < 3}>
              <Ic d={I.search} />
              {res && asked === q ? "Search again" : `Search the web for “${q.length > 40 ? q.slice(0, 40) + "…" : q}”`}
            </button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Looks at registries, charity sites, news, fundraisers and public posts on X, Instagram and Threads.</span>
          </div>
        )}

        {busy && <PipSearching found={res?.results.length ?? 0} />}

        {error && <p className="form-err" role="alert" style={{ margin: 0 }}>{error}</p>}

        {res && !busy && (
          <>
            {res.summary && <p style={{ margin: 0 }}>{res.summary}</p>}
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              Searched {new Date(res.searchedAt).toLocaleString()}
              {res.cached ? " · saved result from the last few hours" : ""}. Pip suggests, you decide. Check the links before you give.
            </p>
            {res.results.length === 0 && <p style={{ margin: 0 }}>I couldn’t find anything I could back with sources. Try different words.</p>}
          </>
        )}

        {charities.length > 0 && (
          <div className="results">
            {charities.map((f) => {
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

        {people.length > 0 && (
          <>
            <h3 style={{ margin: "6px 0 0", fontSize: 15 }}>People in need</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              Found in news, fundraisers and public posts. Personal appeals are harder to check than charities, so read the sources first. You can give once. People can’t join your monthly plan.
            </p>
            <div className="results">
              {people.map((f) => (
                <FoundCard key={toCharity(f).id} f={f}>
                  <GiveOnce f={f} />
                </FoundCard>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
