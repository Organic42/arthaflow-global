import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Read the "redirect" parameter that your login page is sending
  const destination = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    
    // Exchange the secure code for a logged-in user session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Success! Send them to /dashboard
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // If something goes wrong, send them back to the login page
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}