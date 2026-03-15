import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ExamLockProvider } from "@/lib/exam-lock-context";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ExamLockProvider>
      <DashboardShell>{children}</DashboardShell>
    </ExamLockProvider>
  );
}
