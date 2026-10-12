import type { Metadata } from "next";
import { Suspense } from "react";
import "../auth.css";
import ResetScreen from "@/components/auth/ResetScreen";

export const metadata: Metadata = { title: "Forgot password — GiveWise" };

export default function Page() {
  return (
    <Suspense>
      <ResetScreen mode="request" />
    </Suspense>
  );
}
