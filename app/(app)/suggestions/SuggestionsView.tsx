"use client";

import Link from "next/link";
import EmptyState from "@/components/app/EmptyState";
import LiveAppeals from "@/components/app/LiveAppeals";

/** Pip's suggestions: live urgent appeals Pip found on the web. No sample data. */
export default function SuggestionsView() {
  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Pip’s suggestions</h1>
          <p>Urgent appeals Pip found on the web, each with sources. Pip suggests. Only you decide.</p>
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
