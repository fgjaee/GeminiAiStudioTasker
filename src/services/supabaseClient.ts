
// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// These variables are expected to be set in the environment.
// In a local development environment, you might use a .env file.
// In a deployed environment (like Vercel, Netlify, or AI Studio), these are configured as environment variables.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anonymous key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
