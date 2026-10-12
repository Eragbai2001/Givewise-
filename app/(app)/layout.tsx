import "../app.css";
import AppShell from "@/components/app/AppShell";
import { DemoStateProvider } from "@/lib/demo-state";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoStateProvider>
      <AppShell>{children}</AppShell>
    </DemoStateProvider>
  );
}
