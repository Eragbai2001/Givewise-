import Image from "next/image";
import Pip from "../Pip";
import { steps } from "@/lib/landing-data";
import Words from "./Words";

export default function HowItWorks() {
  return (
    <>
      <section className="how" id="how" aria-labelledby="how-h">
        <div className="l">
          <span className="kick"><i />How it works</span>
          <h2 className="disp words" id="how-h"><Words text="How Pip gives with you" /></h2>
        </div>
        <span className="vr" aria-hidden="true" />
        <div className="r">
          <p className="label">Four steps. You approve every one.</p>
          <div className="ph" style={{ overflow: "visible" }}>
            <div className="ph" data-reveal="img" style={{ position: "absolute", inset: 0 }}>
              <Image src="/images/team-hd.jpg" alt="A team of volunteers holding donation boxes" fill sizes="(max-width: 900px) 100vw, 50vw" />
            </div>
            <div className="pip-on" data-reveal="pop" style={{ ["--d" as string]: "700ms" }}>
              <Pip mood="idle" size={110} />
            </div>
          </div>
        </div>
      </section>
      <ol className="steps">
        {steps.map((s, i) => (
          <li className="step" key={s.n} data-reveal style={{ ["--d" as string]: `${i * 110}ms` }}>
            <span className="disp n" aria-hidden="true">{s.n}</span>
            <strong>{s.title}</strong>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
