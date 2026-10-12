"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "../Icon";
import { updates } from "@/lib/landing-data";
import Words from "./Words";

export default function ImpactUpdates() {
  const [i, setI] = useState(0);
  const u = updates[i];
  const go = (d: number) => setI((i + d + updates.length) % updates.length);

  return (
    <section className="imp2" id="impact" aria-labelledby="im-h">
      <div className="lft">
        <div className="ph" data-reveal="img">
          <Image key={u.img} src={u.img} alt={u.alt} fill sizes="(max-width: 900px) 100vw, 60vw" />
        </div>
        <div className="upd" aria-live="polite">
          <div className="t">
            <strong>{u.title}</strong>
            <div className="arrows">
              <button onClick={() => go(-1)} aria-label="Previous update"><Icon name="arrowLeft" small /></button>
              <button onClick={() => go(1)} aria-label="Next update"><Icon name="arrowRight" small /></button>
            </div>
          </div>
          <p>{u.body}</p>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
            <span className={`chip ${u.conf.chip}`}><i />{u.conf.label}</span>
            <a className="src" href="#">{u.src}</a>
            <span style={{ color: "var(--muted)" }}>{u.when}</span>
          </span>
        </div>
      </div>
      <div className="rgt">
        <span className="kick"><i />Impact</span>
        <h2 className="disp words" id="im-h"><Words text="Real updates, not promises" /></h2>
        <p style={{ color: "rgba(255,255,255,.75)", fontSize: 15, lineHeight: "23px", maxWidth: 360 }}>
          When a charity reports what your money did, Pip checks it and tells you how sure it is. If there’s nothing to check, we say so.
        </p>
      </div>
    </section>
  );
}
