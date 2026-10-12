const PATHS = {
  arrowRight: ["M5 12h14", "M12 5l7 7-7 7"],
  arrowLeft: ["M19 12H5", "M12 19l-7-7 7-7"],
  arrowUpRight: ["M7 17L17 7", "M8 7h9v9"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
  sun: ["M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4", "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  close: ["M18 6L6 18", "M6 6l12 12"],
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
  return (
    <svg className={small ? "ic ic-s" : "ic"} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
