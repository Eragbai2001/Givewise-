import Image from "next/image";
import Link from "next/link";
import { charities, usd } from "@/lib/landing-data";

export default function Charities() {
  return (
    <section className="chs" id="charities" aria-labelledby="ch-h">
      <div className="top">
        <span className="kick"><i />Checked charities</span>
        <div>
          <h2 className="disp" id="ch-h" data-reveal>
            Charities Pip{" "}
            <span className="pillimg">
              <Image src="/images/friends-hd.jpg" alt="" width={120} height={52} />
            </span>{" "}
            has already checked
          </h2>
          <p className="lead">Each one shows its progress, how sure Pip is, and where the information came from. Sample data for now.</p>
        </div>
        <span />
      </div>
      <div className="cgrid">
        {charities.map((o, i) => {
          const pct = Math.round((o.raised / o.goal) * 100);
          return (
            <article className="ccard2" key={o.name} data-reveal style={{ ["--d" as string]: `${i * 140}ms` }}>
              <div className="ph" data-reveal="img" style={{ ["--d" as string]: `${i * 140 + 100}ms` }}>
                <Image src={o.img} alt={o.alt} fill sizes="(max-width: 640px) 100vw, 33vw" />
              </div>
              <span className="raised num">
                <b>{usd(o.raised)}</b> raised of {usd(o.goal)}
              </span>
              <div className="meter" role="img" aria-label={`${usd(o.raised)} raised of ${usd(o.goal)}`}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <strong>{o.name}</strong>
              <div className="row3">
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span className={`chip ${o.conf.chip}`}><i />{o.conf.label}</span>
                  <a className="src" href="#">Source</a>
                </span>
                <Link className="pillbtn out" href="/signup">
                  Add to my plan
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
