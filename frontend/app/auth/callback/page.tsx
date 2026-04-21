'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { queueAuthNotificationToStorage } from '@/lib/authNotifications';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let redirected = false;

    const redirect = (path: string) => {
      if (redirected) return;
      redirected = true;
      router.replace(path);
    };

    // Check for error in query params (user cancelled, etc.)
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get('error');
    if (urlError) {
      console.error('Auth error:', urlError, urlParams.get('error_description'));
      queueAuthNotificationToStorage(window.sessionStorage, {
        tone: 'error',
        title: 'Login Error',
        message: 'Google login was cancelled or denied.',
      });
      redirect('/login');
      return;
    }

    const handleSession = async (session: { user: { email?: string; id: string; user_metadata?: Record<string, string> } }) => {
      try {
        const res = await fetch('/api/auth/google/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.user.email,
            firstName:
              session.user.user_metadata?.full_name?.split(' ')[0] ||
              session.user.user_metadata?.name?.split(' ')[0] ||
              '',
            lastName:
              session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            profileUrl:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              '',
            googleId: session.user.id,
          }),
        });

        const data = await res.json();

        if (data.success) {
          redirect('/home');
        } else if (data.needsRegistration) {
          // Store pending data then go to register
          await fetch('/api/auth/google/store-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: session.user.email,
              firstName:
                session.user.user_metadata?.full_name?.split(' ')[0] ||
                session.user.user_metadata?.name?.split(' ')[0] ||
                '',
              lastName:
                session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              profileUrl:
                session.user.user_metadata?.avatar_url ||
                session.user.user_metadata?.picture ||
                '',
              googleId: session.user.id,
            }),
          });
          redirect('/register');
        } else {
          queueAuthNotificationToStorage(window.sessionStorage, {
            tone: 'error',
            title: 'Login Error',
            message: 'An unexpected error occurred during login.',
          });
          redirect('/login');
        }
      } catch {
        queueAuthNotificationToStorage(window.sessionStorage, {
          tone: 'error',
          title: 'Login Error',
          message: 'An unexpected error occurred during login.',
        });
        redirect('/login');
      }
    };

    // First try getSession() — may already be set if Supabase parsed the hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSession(session as Parameters<typeof handleSession>[0]);
        return;
      }

      // Otherwise wait for the SIGNED_IN event (implicit flow hash parsing)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          subscription.unsubscribe();
          handleSession(session as Parameters<typeof handleSession>[0]);
        }
      });

      // Timeout fallback — only fires if nothing else redirected
      setTimeout(() => {
        subscription.unsubscribe();
        if (!redirected) {
          console.error('Auth timeout — no session received');
          queueAuthNotificationToStorage(window.sessionStorage, {
            tone: 'error',
            title: 'Login Error',
            message: 'Google login was cancelled or denied.',
          });
          redirect('/login');
        }
      }, 10000);
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
