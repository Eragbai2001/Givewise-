import type { Metadata } from "next";
import { Suspense } from "react";
import PaypalDone from "./PaypalDone";

export const metadata: Metadata = { title: "PayPal — GiveWise" };

export default function Page() {
  return (
    <Suspense>
      <PaypalDone />
    </Suspense>
  );
}
