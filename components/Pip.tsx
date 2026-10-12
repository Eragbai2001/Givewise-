import "./pip.css";

export type PipMood = "idle" | "listening" | "researching" | "happy" | "concerned" | "celebrating";

const MOVES: Record<PipMood, string> = {
  idle: "anim-breathe",
  listening: "anim-sway",
  researching: "anim-breathe",
  happy: "anim-hop",
  concerned: "anim-tilt",
  celebrating: "anim-hop",
};
const PUPILS: Partial<Record<PipMood, string>> = {
  listening: "translate(-3 2)",
  researching: "translate(3 3)",
  concerned: "translate(-2 -3)",
};
const TILTS: Partial<Record<PipMood, string>> = {
  listening: "rotate(-9 80 148)",
  concerned: "rotate(5 80 148)",
};
const LABELS: Record<PipMood, string> = {
  idle: "idle",
  listening: "listening",
  researching: "researching",
  happy: "happy",
  concerned: "curious, needs your look",
  celebrating: "celebrating",
};

type PipProps = {
  mood?: PipMood;
  size?: number;
  /** Set false for small or repeated uses. Reduced-motion is always respected. */
  motion?: boolean;
  className?: string;
  /** Hide from assistive tech when it is purely decorative. */
  decorative?: boolean;
};

/** Pip, the GiveWise guide. Never pressures, never approves anything. */
export default function Pip({ mood = "idle", size = 160, motion = true, className, decorative = false }: PipProps) {
  const is = (m: PipMood) => mood === m;
  const openEyes = !(is("happy") || is("celebrating"));

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={["pip", motion ? "moving" : "still", className].filter(Boolean).join(" ")}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Pip, the GiveWise guide — ${LABELS[mood]}`}
    >
      <ellipse className="shadow" cx="80" cy="151" rx="32" ry="4.5" />
      <g transform={TILTS[mood] ?? "rotate(0 80 148)"}>
        <g className={MOVES[mood]}>
          {is("researching") && (
            <>
              <g className="anim-paper1">
                <g transform="rotate(-16 30 92)">
                  <rect className="paper" x="6" y="64" width="44" height="56" rx="5" />
                  <path className="paperline" d="M14 78h26M14 87h28M14 96h20" />
                </g>
              </g>
              <g className="anim-paper2">
                <g transform="rotate(-5 40 86)">
                  <rect className="paper" x="16" y="58" width="44" height="56" rx="5" />
                  <path className="paperline" d="M24 72h26M24 81h28M24 90h18" />
                </g>
              </g>
            </>
          )}
          {is("celebrating") && (
            <>
              <path className="limb" d="M44 100 Q26 84 28 60" />
              <path className="limb" d="M116 100 Q134 84 132 60" />
              <circle className="hand" cx="28" cy="57" r="6" />
              <circle className="hand" cx="132" cy="57" r="6" />
            </>
          )}
          <path className="body" d="M80 16 C74 30 36 64 36 100 A44 44 0 0 0 124 100 C124 64 86 30 80 16 Z" />
          <ellipse className="hl" cx="58" cy="78" rx="6.5" ry="13" transform="rotate(28 58 78)" />
          <circle className="hl2" cx="66" cy="60" r="3" />
          <ellipse className="cheek" cx="55" cy="114" rx="7" ry="4" />
          <ellipse className="cheek" cx="105" cy="114" rx="7" ry="4" />

          {openEyes ? (
            <g className="anim-blink">
              <ellipse className="eyewhite" cx="66" cy="98" rx="10" ry="11.5" />
              <ellipse className="eyewhite" cx="94" cy="98" rx="10" ry="11.5" />
              <g transform={PUPILS[mood] ?? "translate(0 0)"}>
                <circle className="pupil" cx="67" cy="99" r="5.6" />
                <circle className="pupil" cx="95" cy="99" r="5.6" />
                <circle className="glint" cx="69.2" cy="96.4" r="1.9" />
                <circle className="glint" cx="97.2" cy="96.4" r="1.9" />
              </g>
            </g>
          ) : (
            <>
              <path className="line" d="M57 101 Q66 90 75 101" />
              <path className="line" d="M85 101 Q94 90 103 101" />
            </>
          )}

          {is("concerned") && (
            <>
              <path className="brow" d="M57 82 Q65 80 73 82" />
              <path className="brow" d="M86 79 Q94 73 102 78" />
            </>
          )}

          {is("idle") && <path className="line" d="M72 116 Q80 123 88 116" />}
          {is("listening") && <ellipse className="mouthfill" cx="79" cy="119" rx="3.6" ry="4.2" />}
          {is("researching") && <path className="line" d="M74 119 Q80 116.5 86 119" />}
          {(is("happy") || is("celebrating")) && (
            <>
              <path className="mouthfill" d="M69 113 Q80 130 91 113 Z" />
              <path className="tongue" d="M74.5 120.5 Q80 126.5 85.5 120.5 Q80 117.5 74.5 120.5 Z" />
            </>
          )}
          {is("concerned") && <ellipse className="mouthfill" cx="83" cy="119" rx="3.2" ry="2.8" />}

          {is("researching") && (
            <>
              <path className="limb" d="M112 120 Q122 124 126 120" />
              <g className="anim-scan">
                <line className="handle" x1="131" y1="127" x2="143" y2="141" />
                <circle className="lens" cx="122" cy="117" r="14" />
              </g>
            </>
          )}
          {is("listening") && (
            <>
              <path className="sound anim-pulse" d="M27 92 Q21 101 27 110" />
              <path className="sound anim-pulse d2" d="M17 84 Q7 101 17 118" />
            </>
          )}
          {is("concerned") && (
            <g className="anim-float">
              <circle className="bubble" cx="128" cy="50" r="13" />
              <text className="qmark" x="128" y="56">
                ?
              </text>
            </g>
          )}
          {is("happy") && (
            <>
              <path className="spark anim-twinkle" d="M132 52 L135 60 L143 63 L135 66 L132 74 L129 66 L121 63 L129 60 Z" />
              <path className="spark anim-twinkle d2" d="M30 60 L32 65 L37 67 L32 69 L30 74 L28 69 L23 67 L28 65 Z" />
            </>
          )}
        </g>
      </g>
      {is("celebrating") && (
        <>
          <rect className="c1 anim-fall" x="20" y="18" width="7" height="4" rx="1" />
          <rect className="c2 anim-fall d1" x="48" y="8" width="6" height="6" rx="1" />
          <circle className="c3 anim-fall d2" cx="112" cy="12" r="3.5" />
          <rect className="c4 anim-fall d3" x="138" y="22" width="7" height="4" rx="1" />
          <circle className="c2 anim-fall d4" cx="100" cy="30" r="3" />
          <rect className="c3 anim-fall d1" x="146" y="40" width="4" height="7" rx="1" />
          <circle className="c4 anim-fall d3" cx="10" cy="38" r="3" />
        </>
      )}
    </svg>
  );
}

/** Static Pip face used as the GiveWise logo mark. */
export function PipLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="30 10 100 140" width={size} height={size} className={className} aria-hidden="true">
      <path d="M80 16 C74 30 36 64 36 100 A44 44 0 0 0 124 100 C124 64 86 30 80 16 Z" fill="#2A8C82" />
      <ellipse cx="58" cy="78" rx="6.5" ry="13" transform="rotate(28 58 78)" fill="#FFFFFF" opacity={0.4} />
      <ellipse cx="55" cy="114" rx="7" ry="4" fill="#F2A68C" opacity={0.6} />
      <ellipse cx="105" cy="114" rx="7" ry="4" fill="#F2A68C" opacity={0.6} />
      <ellipse cx="66" cy="98" rx="10" ry="11.5" fill="#FFFFFF" />
      <ellipse cx="94" cy="98" rx="10" ry="11.5" fill="#FFFFFF" />
      <circle cx="67" cy="99" r="5.6" fill="#1E2B2A" />
      <circle cx="95" cy="99" r="5.6" fill="#1E2B2A" />
      <circle cx="69.2" cy="96.4" r="1.9" fill="#FFFFFF" />
      <circle cx="97.2" cy="96.4" r="1.9" fill="#FFFFFF" />
      <path d="M72 116 Q80 123 88 116" fill="none" stroke="#1E2B2A" strokeWidth={3.2} strokeLinecap="round" />
    </svg>
  );
}
