import Image from "next/image";

export default function Intro() {
  return (
    <>
      <section className="intro" aria-label="What GiveWise is">
        <span className="kick" data-reveal><i />What is GiveWise</span>
        <p className="label" data-reveal style={{ ["--d" as string]: "100ms" }}>Your values, a monthly budget, and a helper who does the homework</p>
        <div className="body" data-reveal style={{ ["--d" as string]: "200ms" }}>
          <p>Most people want to give, but don’t know which charities actually deliver. GiveWise turns what you care about into a simple monthly plan with charities that can show their results.</p>
          <p>Every claim comes with a source and a label: Verified, Partly verified, or Couldn’t verify. Payments go from your PayPal straight to each charity. GiveWise never holds your money.</p>
        </div>
      </section>

      <div className="ph wide" data-reveal="img">
        <Image src="/images/hands-hd.jpg" alt="Volunteers putting their hands together" fill sizes="100vw" quality={90} />
      </div>

      <div className="stats2">
        <div className="st mint" data-reveal>
          <Image className="who" src="/images/thumbs-hd.jpg" alt="" width={150} height={160} />
          <div className="stx">
            <span>Set up in about</span>
            <span className="disp num2">3 min</span>
            <span>with Pip</span>
          </div>
        </div>
        <div className="st sand" data-reveal style={{ ["--d" as string]: "150ms" }}>
          <span className="cap">held by GiveWise. Your money goes straight to each charity through PayPal.</span>
          <span className="disp num2">$0</span>
        </div>
      </div>
    </>
  );
}
