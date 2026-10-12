import Image from "next/image";
import Link from "next/link";
import { PipLogo } from "../Pip";

export default function Footer() {
  return (
    <footer className="lfoot" id="for-charities">
      <div className="wrap">
        <div className="cols">
          <div>
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#causes">Causes</a>
            <a href="#charities">Charities</a>
            <a href="#impact">Impact</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">For charities</a>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
          </div>
          <div>
            <h4>Contact</h4>
            <span>Lagos, Nigeria</span>
            <a href="mailto:hello@givewise.example">hello@givewise.example</a>
          </div>
          <div>
            <h4>Get updates</h4>
            <span>Stories and new charities, once a month.</span>
          </div>
          <span className="logo">
            <PipLogo className="logo-mark" size={28} />
            <span>GiveWise</span>
          </span>
        </div>
        <div className="bot" data-reveal>
          <span className="disp">
            Hey <Image src="/images/wave.png" alt="" width={56} height={56} />
          </span>
          <span className="line" aria-hidden="true" />
          <Link className="disp" href="/signup" style={{ color: "#fff", textDecoration: "none" }}>
            Start giving
          </Link>
          <small>© 2026 GiveWise</small>
        </div>
      </div>
    </footer>
  );
}
