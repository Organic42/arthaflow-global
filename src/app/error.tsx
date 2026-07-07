"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <div className="text-[96px] font-extrabold leading-none tracking-[-4px] text-border">
        Oops
      </div>
      <h2 className="mt-3 mb-2 text-[22px] font-bold text-text-heading">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-[380px] text-sm text-text-secondary">
        An unexpected error occurred. Try again, or head back to the homepage.
        If it keeps happening, write to info@arthaflowglobal.com.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RotateCcw size={16} />
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline">
            <Home size={16} />
            Go to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}
