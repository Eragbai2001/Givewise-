"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PipLogo } from "../Pip";
import ThemeToggle from "../ThemeToggle";
import { I, Ic } from "./icons";
import { authClient, fetchMe, type Me } from "@/lib/auth-client";
import { setOnboardedLocal } from "@/lib/onboarding";
import { usePayments } from "@/lib/use-payments";

const MAIN = [
  { href: "/plan", label: "My plan", icon: I.plan },
  { href: "/discover", label: "Discover", icon: I.search },
  { href: "/suggestions", label: "Urgent needs", icon: I.bulb },
  { href: "/impact", label: "Impact", icon: I.heart },
  { href: "/history", label: "History & receipts", icon: I.file },
];
const OTHER = [{ href: "/settings", label: "Settings", icon: I.sliders }];
const BOTTOM = [
  { href: "/plan", label: "My plan", icon: I.plan },
  { href: "/discover", label: "Discover", icon: I.search },
  { href: "/impact", label: "Impact", icon: I.heart },
  { href: "/history", label: "Receipts", icon: I.file },
  { href: "/settings", label: "Settings", icon: I.sliders },
];
const TITLES: Record<string, string> = {
  "/plan": "My plan",
  "/suggestions": "Urgent needs",
  "/discover": "Discover",
  "/impact": "Impact",
  "/history": "History & receipts",
  "/settings": "Settings",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  // Signed-in user (null = browsing the demo without an account).
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    fetchMe().then(({ user }) => {
      // The app is for signed-in donors only. Send everyone else to log in.
      if (!user) return router.replace("/login");
      setMe(user);
      setOnboardedLocal(user.onboarded);
      setChecked(true);
    });
  }, [router]);

  // The real limit and this month's giving, shown in the sidebar card and the strip.
  const { status } = usePayments();
  const usd = (c: number) => `$${Number.isInteger(c / 100) ? c / 100 : (c / 100).toFixed(2)}`;
  const limitC = status?.hardLimitCents ?? 5000;
  const givenC = status?.givenThisMonthCents ?? 0;
  const plannedC = status?.planSaved ? status.plan.reduce((t, i) => t + i.amountCents, 0) : 0;
  const pct = Math.min(100, Math.round((givenC / limitC) * 100));
  const initials = (me?.name || me?.email || "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const logout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  // Collapsed sidebar = icon rail. Remembered per browser.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("gw-side") === "collapsed");
    } catch {}
  }, []);
  const toggleSide = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("gw-side", c ? "open" : "collapsed");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="gwapp">
      <div className={`shell ${collapsed ? "collapsed" : ""}`}>
        <aside className="side" aria-label="Sidebar">
          <div className="brand">
            <Link className="logo" href="/plan">
              <PipLogo className="logo-mark" />
              <span>GiveWise</span>
            </Link>
            <button
              className="iconbtn sq collapse"
              onClick={toggleSide}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Ic d={collapsed ? I.chevronRight : I.chevronLeft} />
            </button>
          </div>
          <div className="sec">Giving</div>
          <nav className="nav" aria-label="Main">
            {MAIN.map((n) => (
              <Link key={n.href} href={n.href} className={active(n.href) ? "on" : ""} aria-current={active(n.href) ? "page" : undefined} title={n.label}>
                <Ic d={n.icon} small={false} />
                <span className="lbl">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="sec">Other</div>
          <nav className="nav" aria-label="Other">
            {OTHER.map((n) => (
              <Link key={n.href} href={n.href} className={active(n.href) ? "on" : ""} aria-current={active(n.href) ? "page" : undefined} title={n.label}>
                <Ic d={n.icon} small={false} />
                <span className="lbl">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            <div className="guard">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <Ic d={I.lock} style={{ color: "var(--accent-ink)" }} />
                    Spending limit
                  </span>
                  <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{usd(limitC)}/mo</span>
                </div>
                <div className="meter" role="img" aria-label={`${usd(givenC)} of ${usd(limitC)} monthly limit given this month`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {usd(givenC)} given this month · {usd(plannedC)} planned
                </span>
              <span style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: "16px", color: "var(--text2)", paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                <Ic d={I.shield} style={{ color: "var(--accent-ink)", marginTop: 1 }} />
                Nothing moves without your approval
              </span>
            </div>
            <nav className="nav" aria-label="Account">
              <Link href="/help" title="Help & support">
                <Ic d={I.help} small={false} />
                <span className="lbl">Help &amp; support</span>
              </Link>
              <Link className="logout" href="/login" title="Log out" onClick={logout}>
                <Ic d={I.logout} small={false} />
                <span className="lbl">Log out</span>
              </Link>
            </nav>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <Link className="logo mob-brand" href="/plan">
              <PipLogo className="logo-mark" size={30} />
              <span>GiveWise</span>
            </Link>
            <nav className="crumb" aria-label="Breadcrumb">
              <strong>{TITLES[path] ?? "GiveWise"}</strong>
            </nav>
            <span style={{ flex: 1 }} />
            <ThemeToggle />
            <Link className="iconbtn" href="/suggestions" aria-label="Urgent needs">
              <Ic d={I.bell} />
            </Link>
            <div className="me">
              <span className="avatar" title={me ? `${me.name} · ${me.email}` : undefined}>{initials}</span>
            </div>
          </header>
          <div className="guard-strip">
            <span>
              <Ic d={I.lock} />
              Limit <span className="num">{usd(limitC)}</span>/mo
            </span>
            <span>
              <Ic d={I.shield} />
              <b className="gs-l">Nothing moves without your approval</b>
              <b className="gs-s">Only you approve</b>
            </span>
          </div>

          {checked ? children : <main className="content" aria-busy="true" />}

          <nav className="bottomnav" aria-label="Main">
            {BOTTOM.map((n) => (
              <Link key={n.href} href={n.href} className={active(n.href) ? "on" : ""} aria-current={active(n.href) ? "page" : undefined}>
                <Ic d={n.icon} small={false} />
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
