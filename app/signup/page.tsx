import type { Metadata } from "next";
import { Suspense } from "react";
import "../auth.css";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Create your account — GiveWise" };

export default function Page() {
  return (
    <Suspense>
      <AuthScreen mode="signup" />
    </Suspense>
  );
}
