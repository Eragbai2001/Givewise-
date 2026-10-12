"use client";

import { useState } from "react";
import Pip from "@/components/Pip";
import { I, Ic } from "@/components/app/icons";
import type { Charity } from "@/lib/discover-data";
import type { FoundCharity, SearchResult } from "@/lib/pip-search";

type Props = {
  query: string;
  picks: string[];
  onFound: (found: Charity[]) => void;
  onToggle: (id: string) => void;
};

const KIND_LABEL: Record<string, string> = { registry: "Registry", report: "Report", news: "News", official: "Official site", social: "Social post", other: "Source" };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

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
    id: `live-${slug(f.name)}`,
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

/** "Ask Pip": live web research. Every claim carries links the donor can open. */
export default function LiveSearch({ query, picks, onFound, onToggle }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const [asked, setAsked] = useState("");

  const q = query.trim();
  if (q.length < 3 && !res && !busy) return null;

  async function ask() {
    setError("");
    setBusy(true);
    setAsked(q);
    try {
      const r = await fetch("/api/pip/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Pip couldn’t finish that search. Please try again.");
      } else {
        setRes(d as SearchResult);
        onFound((d as SearchResult).results.map(toCharity));
      }
    } catch {
      setError("Pip couldn’t be reached. Please try again.");
    }
    setBusy(false);
  }

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
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Looks at registries, charity sites, news and public posts. Takes up to a minute.</span>
          </div>
        )}

        {busy && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }} role="status">
            <Pip mood="researching" size={56} motion={false} decorative />
            <span>Pip is searching and checking sources…</span>
          </div>
        )}

        {error && <p className="form-err" role="alert" style={{ margin: 0 }}>{error}</p>}

        {res && !busy && (
          <>
            {res.summary && <p style={{ margin: 0 }}>{res.summary}</p>}
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              Searched {new Date(res.searchedAt).toLocaleString()}
              {res.cached ? " · saved result from the last few hours" : ""}. Pip suggests, you decide. Check the links before you give.
            </p>
            {res.results.length === 0 && <p style={{ margin: 0 }}>I couldn’t find charities I could back with sources. Try different words.</p>}
            <div className="results">
              {res.results.map((f) => {
                const c = toCharity(f);
                const on = picks.includes(c.id);
                return (
                  <article key={c.id} className={`ccard ${on ? "picked" : ""}`} aria-label={f.name}>
                    <div className="top">
                      <span className="logo-ph" style={{ background: c.tint, color: c.ink }}>{c.ini}</span>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <h3>{f.name}</h3>
                        <span className="loc">{f.place}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {f.cause && <span className="chip neutral">{f.cause}</span>}
                      {f.confidence === "verified" && <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Verified</span>}
                      {f.confidence === "partial" && <span className="chip rev"><i />Partly verified</span>}
                      {f.confidence === "none" && <span className="chip conf-n">Couldn’t verify</span>}
                    </div>
                    {f.what && <p style={{ margin: 0 }}>{f.what}</p>}
                    <div className="outcome" style={{ alignItems: "flex-start" }}>
                      <span><b>Right now:</b> {f.need || "No current appeal found"}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{f.confidenceReason}</p>
                    {f.redFlags.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--red-ink)" }}>
                        {f.redFlags.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    )}
                    {f.proofs.length > 0 ? (
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                        {f.proofs.map((p) => (
                          <li key={p.url} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                            <span className="chip neutral">{KIND_LABEL[p.kind] ?? "Source"}</span>
                            <a className="src" href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                            <span style={{ color: "var(--muted)" }}>{p.domain}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13 }}>No sources I can show you.</p>
                    )}
                    <div className="foot2">
                      {f.website ? <a className="src" href={f.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)" }}>Website</a> : <span />}
                      <button className={`btn btn-sm ${on ? "added" : ""}`} onClick={() => onToggle(c.id)} aria-pressed={on}>
                        <Ic d={on ? I.check : ["M12 5v14", "M5 12h14"]} />
                        {on ? "Picked" : "Add to picks"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
