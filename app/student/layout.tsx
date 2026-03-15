import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
