import "./landing.css";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Intro from "@/components/landing/Intro";
import HowItWorks from "@/components/landing/HowItWorks";
import Causes from "@/components/landing/Causes";
import Charities from "@/components/landing/Charities";
import ImpactUpdates from "@/components/landing/ImpactUpdates";
import StartGiving from "@/components/landing/StartGiving";
import Footer from "@/components/landing/Footer";
import Ticker from "@/components/landing/Ticker";
import RevealObserver from "@/components/RevealObserver";

export default function LandingPage() {
  return (
    <div className="lp">
      <Nav />
      <main className="wrap">
        <Hero />
        <Ticker />
        <Intro />
        <HowItWorks />
        <Causes />
        <Charities />
        <ImpactUpdates />
        <StartGiving />
      </main>
      <Footer />
      <RevealObserver />
    </div>
  );
}
