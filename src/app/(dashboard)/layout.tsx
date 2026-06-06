import { DashNav } from "@/components/arthaflow/dash-nav";
import { Sidebar } from "@/components/arthaflow/sidebar";
import { PageTransition } from "@/components/arthaflow/page-transition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <DashNav />
        <main className="flex-1 p-6 md:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}