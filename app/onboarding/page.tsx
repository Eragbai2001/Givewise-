import type { Metadata } from "next";
import { Suspense } from "react";
import "../onboarding.css";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = { title: "Set up with Pip — GiveWise" };

export default function Page() {
  return (
    <Suspense>
      <OnboardingFlow />
    </Suspense>
  );
}
