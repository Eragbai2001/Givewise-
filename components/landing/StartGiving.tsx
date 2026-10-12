"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Pip from "../Pip";
import Words from "./Words";

const AMOUNTS = [10, 25, 50, 75];

export default function StartGiving() {
  const [monthly, setMonthly] = useState(true);
  const [amt, setAmt] = useState(25);
  const [email, setEmail] = useState("");

  const href = `/signup?amount=${amt}&frequency=${monthly ? "monthly" : "once"}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <section className="give" aria-labelledby="gv-h" data-reveal>
      <div className="l">
        <span className="kick"><i />Start giving</span>
        <h2 className="disp words" id="gv-h"><Words text="Start with what you can" /></h2>
        <div className="ph mini-ph">
          <Image src="/images/heart-hd.jpg" alt="" fill sizes="110px" />
        </div>
      </div>
      <div className="m">
        <p className="label">Small amounts, given well, add up</p>
        <div className="ph" data-reveal="img" style={{ ["--d" as string]: "250ms" }}>
          <Image src="/images/friends-hd.jpg" alt="Two friends smiling together" fill sizes="25vw" />
        </div>
      </div>
      <form className="gform" onSubmit={(e) => e.preventDefault()}>
        <span className="lab" id="freq-l">How often</span>
        <div className="freq" role="radiogroup" aria-labelledby="freq-l">
          <button type="button" className={monthly ? "on" : ""} role="radio" aria-checked={monthly} onClick={() => setMonthly(true)}>
            <i />Monthly
          </button>
          <button type="button" className={!monthly ? "on" : ""} role="radio" aria-checked={!monthly} onClick={() => setMonthly(false)}>
            <i />One time
          </button>
        </div>
        <span className="lab" id="amt-l">Amount</span>
        <div className="amts" role="radiogroup" aria-labelledby="amt-l">
          {AMOUNTS.map((v) => (
            <button key={v} type="button" className={amt === v ? "on" : ""} role="radio" aria-checked={amt === v} onClick={() => setAmt(v)}>
              ${v}
            </button>
          ))}
        </div>
        <label className="lab" htmlFor="gv-email">Your email</label>
        <input id="gv-email" className="ginput" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <div className="gpip">
          <Pip mood="happy" size={34} motion={false} decorative />
          <span>
            Next, I’ll ask what you care about and suggest how to split your ${amt}
            {monthly ? " a month" : ""}. You approve it in PayPal.
          </span>
        </div>
        <Link className="pillbtn" href={href}>
          Continue
        </Link>
        <span className="fine">No card details here. Nothing moves without your approval.</span>
      </form>
    </section>
  );
}
