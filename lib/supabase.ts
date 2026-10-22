"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase connection (browser only). Both values are public by design:
// Row Level Security in supabase/setup.sql decides what each user can do.
// Without them, the app runs as the device-only prototype.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        flowType: "pkce", // safer browser sign-in flow (the SDK default is older "implicit")
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // finishes Google / email-link sign-in when the user comes back
      },
    })
  : null;

export const MEDIA_BUCKET = "media";
