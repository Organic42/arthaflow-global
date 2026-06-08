import { DashNav } from "@/components/arthaflow/dash-nav";
import { Sidebar } from "@/components/arthaflow/sidebar";
import { PageTransition } from "@/components/arthaflow/page-transition";
import { ChatBot } from "@/components/arthaflow/chat-bot"; // 1. Import the ChatBot

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full relative">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <DashNav />
        <main className="flex-1 p-6 md:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      
      {/* 2. Mount the ChatBot here so it floats over the entire dashboard */}
      <ChatBot />
    </div>
  );
}