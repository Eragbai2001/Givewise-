"use client";

import Link from "next/link";
import EmptyState from "@/components/app/EmptyState";
import LiveAppeals from "@/components/app/LiveAppeals";

/** Urgent needs: live appeals and people in need Pip found on the web. No sample data. */
export default function SuggestionsView() {
  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Urgent needs</h1>
          <p>Appeals and people in need right now, found by Pip on the web with sources. For one-off gifts. Only you decide.</p>
        </div>
      </div>

      <LiveAppeals />

      <section className="card">
        <EmptyState
          compact
          title="Weekly suggestions are coming"
          body="Soon Pip will check the charities in your plan every week and suggest changes here, like a project that’s fully funded or a matched gift. Each one will have sources, and nothing changes unless you approve it."
          action={<Link className="btn btn-sm" href="/discover">Find charities with Pip</Link>}
        />
      </section>
    </main>
  );
}
