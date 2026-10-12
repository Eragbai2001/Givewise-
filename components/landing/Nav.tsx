"use client";

import Link from "next/link";
import { useState } from "react";
import { PipLogo } from "../Pip";
import Icon from "../Icon";
import ThemeToggle from "../ThemeToggle";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#causes", label: "Causes" },
  { href: "#charities", label: "Charities" },
  { href: "#impact", label: "Impact" },
  { href: "#for-charities", label: "For charities" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="lnav">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="GiveWise home">
          <PipLogo className="logo-mark" />
          <span>GiveWise</span>
        </Link>
        <nav className="links" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="right">
          <span className="theme-slot">
            <ThemeToggle />
          </span>
          <Link className="login" href="/login">
            Log in
          </Link>
          <Link className="pillbtn" href="/signup">
            Start giving
          </Link>
          <button className="iconbtn menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)} style={{ width: 38, height: 38 }}>
            <Icon name={open ? "close" : "menu"} small />
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" className="mmenu" aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <div className="mmenu-row">
            <span>Appearance</span>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
