"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const bullets = [
  "AI-generated export documents in 30 seconds",
  "Market demand from official UN Comtrade and World Bank data",
  "End-to-end logistics orchestration",
];

// 1. We rename the main function to LoginContent
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const supabase = createClient();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Check onboarding status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (profile && !profile.onboarding_completed) {
          router.push("/onboarding");
        } else {
          router.push(redirectTo);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;

      // Update profile with phone
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          full_name: fullName,
          contact_phone: phone,
        }).eq("id", user.id);
      }

      router.push("/onboarding");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${redirectTo}`,
        
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* LEFT — brand panel */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-navy to-royal-blue px-14 lg:flex">
        <div className="absolute -right-16 -top-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(212,168,67,0.14),transparent_70%)]" />
        <div className="absolute -bottom-36 -left-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.2),transparent_70%)]" />
        <div className="relative max-w-[420px]">
          <Link href="/" className="mb-4 block text-[28px] font-extrabold tracking-tight text-artha-gold">
            ArthaFlow
          </Link>
          <p className="mb-10 text-[19px] leading-relaxed text-white/70">
            Your AI-powered export department
          </p>
          <div className="mb-12 flex flex-col gap-4.5">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-400">
                  <Check size={15} />
                </div>
                <span className="text-[15px] text-white/90">{b}</span>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-white/40">
            Live with 20 pilot manufacturers in Mumbai and Pune
          </p>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="relative flex items-center justify-center bg-card px-8 py-12">
        <Link
          href="/"
          className="absolute left-8 top-6 text-[22px] font-extrabold text-artha-gold lg:hidden"
        >
          ArthaFlow
        </Link>

        <div className="w-full max-w-[380px]">
          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-bg px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {mode === "login" ? (
            <>
              <h1 className="mb-1.5 text-[26px] font-extrabold tracking-tight text-text-heading">
                Welcome back
              </h1>
              <p className="mb-8 text-sm text-text-secondary">
                Sign in to your ArthaFlow account
              </p>

              <div className="flex flex-col gap-4.5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Email</label>
                  <Input
                    type="email"
                    placeholder="you@company.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                  <div className="mt-2 text-right">
                    <a className="cursor-pointer text-[13px] text-action-blue hover:underline">
                      Forgot password?
                    </a>
                  </div>
                </div>
                <Button size="lg" className="w-full" onClick={handleLogin} disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
                </Button>
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[13px] text-text-muted">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={handleGoogleLogin}>
                <GoogleIcon />
                Sign in with Google
              </Button>

              <p className="mt-7 text-center text-sm text-text-secondary">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(null); }}
                  className="font-semibold text-action-blue hover:underline"
                >
                  Register
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-1.5 text-[26px] font-extrabold tracking-tight text-text-heading">
                Start Exporting Today
              </h1>
              <p className="mb-7 text-sm text-text-secondary">
                Create your ArthaFlow account — it&apos;s free
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Full Name</label>
                  <Input
                    placeholder="Rajesh Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Email</label>
                  <Input
                    type="email"
                    placeholder="you@company.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Phone Number</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">+91</span>
                    <Input
                      className="pl-11"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Password</label>
                  <Input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-text-body">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-action-blue"
                  />
                  <span>
                    I agree to the <a className="text-action-blue">Terms of Service</a> and{" "}
                    <a className="text-action-blue">Privacy Policy</a>
                  </span>
                </label>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={!agreed || loading}
                  onClick={handleRegister}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-text-secondary">
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="font-semibold text-action-blue hover:underline"
                >
                  Sign In
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 2. We create a new default export that wraps our content in Suspense!
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-action-blue" /></div>}>
      <LoginContent />
    </Suspense>
  );
}