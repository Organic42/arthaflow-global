import { DashNav } from "@/components/arthaflow/dash-nav";
import { PageTransition } from "@/components/arthaflow/page-transition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashNav />
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
