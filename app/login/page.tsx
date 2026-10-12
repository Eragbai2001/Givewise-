import type { Metadata } from "next";
import { Suspense } from "react";
import "../auth.css";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Log in — GiveWise" };

export default function Page() {
  return (
    <Suspense>
      <AuthScreen mode="login" />
    </Suspense>
  );
}
