import { DashNav } from "@/components/arthaflow/dash-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashNav />
      <main>{children}</main>
    </>
  );
}
