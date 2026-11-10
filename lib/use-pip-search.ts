"use client";

import { useCallback, useRef, useState } from "react";
import type { FoundCharity, SearchResult } from "@/lib/pip-search";

/**
 * Ask Pip, with results streaming in: each card shows as soon as Pip has checked it.
 * `res` is filled in step by step while `busy` is true, and is complete once `busy` is false.
 */
export function usePipSearch() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const run = useRef(0);

  const search = useCallback(async (query: string): Promise<SearchResult | null> => {
    const id = ++run.current;
    setError("");
    setBusy(true);
    setRes({ summary: "", results: [], searchedAt: new Date().toISOString(), cached: false });
    let final: SearchResult | null = null;
    try {
      const r = await fetch("/api/pip/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, stream: true }),
      });
      if (!r.ok || !r.body) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Pip couldn’t finish that search. Please try again.");
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      const handle = (line: string) => {
        if (!line.trim() || id !== run.current) return;
        const ev = JSON.parse(line) as { event: string; item?: FoundCharity; result?: SearchResult; error?: string };
        if (ev.event === "found" && ev.item) {
          const item = ev.item;
          setRes((x) => (!x || x.results.some((r) => r.type === item.type && r.name === item.name) ? x : { ...x, results: [...x.results, item] }));
        } else if (ev.event === "done" && ev.result) {
          final = ev.result;
          setRes(ev.result);
        } else if (ev.event === "error") {
          throw new Error(ev.error || "Pip couldn’t finish that search. Please try again.");
        }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          handle(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
        }
      }
      handle(buf);
      if (!final && id === run.current) throw new Error("Pip’s search stopped early. Please try again.");
    } catch (e) {
      if (id === run.current) {
        setError(e instanceof Error && e.message ? e.message : "Pip couldn’t be reached. Please try again.");
        setRes((x) => (x && x.results.length ? x : null));
      }
    }
    if (id === run.current) setBusy(false);
    return final;
  }, []);

  return { busy, error, res, search };
}
