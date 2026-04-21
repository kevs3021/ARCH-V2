import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_PUBLISHABLE_KEY ||
  '';

// Create and export Supabase client (only if environment variables are present and valid)
let supabase: SupabaseClient | null = null;

// Validate URL format
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

if (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} else {
  console.warn('Missing or invalid Supabase environment variables. Client may not function correctly.');
}

// Server-side client (for API routes)
export const createServerClient = () => {
  const serverUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serverKey = 
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLISHABLE_KEY ||
    supabaseAnonKey;
  
  if (!serverUrl || !serverKey || !isValidUrl(serverUrl)) {
    throw new Error('Supabase environment variables are not configured correctly');
  }
  
  return createClient(serverUrl, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const createServiceRoleClient = () => {
  const serverUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';

  if (!serverUrl || !isValidUrl(serverUrl)) {
    throw new Error('Supabase URL is not configured correctly');
  }

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing from the frontend environment. Add it to frontend/.env.local and restart the dev server.'
    );
  }

  return createClient(serverUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export default supabase;
