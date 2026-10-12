"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchMe } from "@/lib/auth-client";
import { setOnboardedLocal } from "@/lib/onboarding";

/** After PayPal/Google sign-in: onboarding if setup isn't finished, otherwise My plan. */
function Continue() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    fetchMe().then(({ user }) => {
      if (!user) return router.replace("/login?error=1");
      setOnboardedLocal(user.onboarded);
      router.replace(user.onboarded ? "/plan" : `/onboarding${params.size ? `?${params}` : ""}`);
    });
  }, [router, params]);
  return <p style={{ padding: 32, color: "var(--muted)" }}>Signing you in…</p>;
}

export default function Page() {
  return (
    <Suspense>
      <Continue />
    </Suspense>
  );
}
