import Link from "next/link";
import Pip from "../Pip";

export default function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>{title}</h1>
          <p>{blurb}</p>
        </div>
      </div>
      <div className="placeholder">
        <Pip mood="researching" size={110} />
        <h2>Pip is still building this page</h2>
        <p style={{ margin: 0, maxWidth: 360 }}>It’s designed and next in line. For now, head back to your plan.</p>
        <Link className="btn btn-primary" href="/plan">Back to My plan</Link>
      </div>
    </main>
  );
}
