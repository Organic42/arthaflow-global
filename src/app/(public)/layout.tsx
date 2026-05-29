import { PublicNav } from "@/components/arthaflow/public-nav";
import { Footer } from "@/components/arthaflow/footer";
import { PageTransition } from "@/components/arthaflow/page-transition";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  );
}
