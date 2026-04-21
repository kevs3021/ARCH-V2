'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import NotificationStack from '@/components/NotificationStack';
import { consumeAuthNotifications, type AuthNotification } from '@/lib/authNotifications';

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<AuthNotification[]>([]);

  const addNotification = useCallback((notification: Omit<AuthNotification, 'id'>) => {
    const id = crypto.randomUUID();
    setNotifications((current) => [...current, { ...notification, id }]);
    window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    if (!id) return;
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const queued = consumeAuthNotifications();
    if (queued.length > 0) {
      setNotifications((current) => [...current, ...queued]);
    }
  }, [addNotification]);

  useEffect(() => {
    // Check if already logged in - only if auth cookie exists
    const hasAuthCookie = document.cookie.includes('auth-token');
    if (hasAuthCookie) {
      fetch('/api/auth/me').then(res => {
        if (res.ok) {
          router.push('/home');
        }
      }).catch(() => {});
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Login failed';
        addNotification({
          tone: 'error',
          title: 'Login Error',
          message: errorMessage,
        });
        return;
      }

      router.push('/home');
    } catch (err) {
      addNotification({
        tone: 'error',
        title: 'Login Error',
        message: err instanceof Error ? err.message : 'Login failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLarkLogin = async () => {
    try {
      const response = await fetch('/api/auth/lark', {
        method: 'GET',
      });
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        addNotification({
          tone: 'error',
          title: 'Login Error',
          message: 'Failed to initiate Lark login',
        });
      }
    } catch (err) {
      addNotification({
        tone: 'error',
        title: 'Login Error',
        message: 'Failed to initiate Lark login',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <NotificationStack notifications={notifications} onDismiss={removeNotification} />
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl hero-gradient flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <div>
            <span className="font-display font-bold text-3xl text-foreground tracking-tight">ARCH</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
              Welcome Back
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-foreground mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-foreground mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 glass-card !p-2 !py-1 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLarkLogin}
            className="btn-secondary w-full flex items-center justify-center gap-3 py-3.5"
          >
            <Image src="/lark-logo.png" alt="Lark" width={20} height={20} className="w-5 h-5" />
            Continue with Lark
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
