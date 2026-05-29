import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <div className="text-[96px] font-extrabold leading-none tracking-[-4px] text-border">
        404
      </div>
      <h2 className="mt-3 mb-2 text-[22px] font-bold text-text-heading">
        Page not found
      </h2>
      <p className="mb-6 max-w-[360px] text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/">
        <Button>
          <Home size={16} />
          Go to Homepage
        </Button>
      </Link>
    </div>
  );
}
