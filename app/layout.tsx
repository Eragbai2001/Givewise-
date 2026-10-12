import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import "./globals.css";


// Condensed display face, used only for big landing-page headlines.
const display = localFont({
  src: "./fonts/coolvetica-compressed.otf",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GiveWise — give to what matters, know it works",
  description:
    "Tell GiveWise what you care about and a monthly budget. Pip checks every charity, shows the source, and only moves money when you approve it in PayPal.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111614" },
  ],
};

// Sets the theme before first paint so there is no flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('gw-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
