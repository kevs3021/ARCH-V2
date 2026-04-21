import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLISHABLE_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
    throw new Error('Supabase client not configured');
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};