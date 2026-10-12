const ITEMS = ["Clean water", "Girls’ education", "Checked by Pip", "Health", "Hunger", "A source on every claim", "Your community", "You approve every change"];

export default function Ticker() {
  const row = ITEMS.map((t, i) => (
    <span key={i} className={i % 2 ? "disp alt" : "disp"}>
      {t}
      <i aria-hidden="true" />
    </span>
  ));
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {row}
        {row}
      </div>
    </div>
  );
}
