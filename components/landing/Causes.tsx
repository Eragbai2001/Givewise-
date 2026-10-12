"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "../Icon";
import { causes } from "@/lib/landing-data";
import Words from "./Words";

export default function Causes() {
  const [sel, setSel] = useState<string>(causes[0].id);
  const cause = causes.find((c) => c.id === sel) ?? causes[0];

  return (
    <section className="causes" id="causes" aria-labelledby="cz-h">
      <div className="dk">
        <span className="kick"><i />Causes</span>
        <h2 className="disp words" id="cz-h"><Words text="We fund what you care about" /></h2>
        <ul className="clist">
          {causes.map((c, i) => (
            <li key={c.id} data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
              <button className={c.id === sel ? "on" : ""} aria-pressed={c.id === sel} onClick={() => setSel(c.id)}>
                {c.label}
                <Icon name="arrowUpRight" small />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="lt">
        <span className="droplet" aria-hidden="true" />
        <span className="ring" aria-hidden="true" />
        <div className="circ2" data-reveal="circle">
          <Image key={cause.id} src={cause.img} alt={cause.alt} fill sizes="380px" />
          <div className="ov">
            <span className="disp">{cause.label}</span>
          </div>
        </div>
        <span className="cnote" aria-live="polite">{cause.note}</span>
      </div>
    </section>
  );
}
