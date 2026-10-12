export const I = {
  plan: ["M21.2 15.9A10 10 0 1 1 8 2.8", "M22 12A10 10 0 0 0 12 2v10z"],
  bulb: ["M9 18h6", "M10 22h4", "M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-3.5-3.5"],
  heart: ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8", "M8 17h5"],
  sliders: ["M20 7h-9", "M14 17H5", "M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  help: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17h.01"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
  lock: ["M5 11h14v11H5z", "M7 11V7a5 5 0 0 1 10 0v4"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"],
  chevronLeft: ["M15 18l-6-6 6-6"],
  chevronRight: ["M9 18l6-6-6-6"],
  close: ["M18 6L6 18", "M6 6l12 12"],
  wallet: ["M20 12V8H6a2 2 0 0 1 0-4h12v4", "M4 6v12a2 2 0 0 0 2 2h14v-4", "M18 12a2 2 0 0 0 0 4h4v-4z"],
  building: ["M3 21h18", "M5 21V10l7-5 7 5v11", "M10 21v-6h4v6"],
  calendar: ["M3 4h18v18H3z", "M16 2v4", "M8 2v4", "M3 10h18"],
  equalizer: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  filter: ["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"],
  check: ["M20 6L9 17l-5-5"],
  dots: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
} as const;

export function Ic({ d, small = true, style }: { d: readonly string[]; small?: boolean; style?: React.CSSProperties }) {
  return (
    <svg className={small ? "ic ic-s" : "ic"} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}
