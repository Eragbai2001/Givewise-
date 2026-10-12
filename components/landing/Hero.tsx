import Image from "next/image";
import Link from "next/link";
import Pip from "../Pip";
import Icon from "../Icon";
import Words from "./Words";

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-h">
      <div>
        <span className="kick2" data-reveal>Giving, done wisely</span>
        <h1 className="disp words" id="hero-h">
          <Words text="Give to what matters. Know it works." />
        </h1>
        <p className="sub" data-reveal style={{ ["--d" as string]: "450ms" }}>
          Tell GiveWise what you care about and how much you can give each month. Pip, your giving helper, finds charities, checks every claim, and only moves money when you say yes.
        </p>
        <div className="ctas" data-reveal style={{ ["--d" as string]: "600ms" }}>
          <Link className="pillbtn" href="/signup">
            Start giving
          </Link>
          <a className="txt" href="#how">
            See how it works
            <Icon name="arrowRight" small />
          </a>
        </div>
      </div>

      <div className="collage">
        <div className="ph big" data-reveal="img" style={{ ["--d" as string]: "150ms" }}>
          <Image src="/images/hero-hd.jpg" alt="Two volunteers packing a donation box" fill priority quality={90} sizes="(max-width: 900px) 100vw, 45vw" />
        </div>
        <div className="ph circ" data-reveal="circle" style={{ ["--d" as string]: "550ms" }}>
          <Image src="/images/volunteer-box-hd.jpg" alt="A smiling volunteer carrying a box of donations" fill sizes="220px" quality={90} />
        </div>
        <span className="droplet" aria-hidden="true" />
        <div className="vcard" data-reveal="pop" style={{ ["--d" as string]: "900ms" }} aria-label="Example of Pip's weekly check">
          <div className="r">
            <Pip mood="happy" size={36} motion={false} decorative />
            <span style={{ display: "flex", flexDirection: "column" }}>
              <strong>Pip’s weekly check</strong>
              <span className="m">3 charities · checked Monday</span>
            </span>
          </div>
          <div className="meta">
            <span style={{ flex: 1 }}>Bright Futures</span>
            <span className="chip ok"><i />Verified</span>
          </div>
          <div className="meta">
            <span style={{ flex: 1 }}>ClearSpring Water</span>
            <span className="chip neutral"><i />Project funded</span>
          </div>
          <div className="meta">
            <span style={{ flex: 1 }}>Roots Local Aid</span>
            <span className="chip rev"><i />Partly verified</span>
          </div>
        </div>
      </div>
    </section>
  );
}
