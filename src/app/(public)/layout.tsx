import { PublicNav } from "@/components/arthaflow/public-nav";
import { Footer } from "@/components/arthaflow/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
