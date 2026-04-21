'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setSelectedTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const applyTheme = (theme: 'light' | 'dark') => {
    localStorage.setItem('arch-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setSelectedTheme(theme);
  };

  const handleSelectTheme = (newTheme: 'light' | 'dark' | 'system') => {
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setSelectedTheme(prefersDark ? 'dark' : 'light');
    } else {
      setSelectedTheme(newTheme);
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    applyTheme(selectedTheme);
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen py-8 pb-24 relative z-10 pl-0 lg:pl-4 -mr-4 lg:-mr-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account preferences and application settings.
          </p>
        </div>

        <div className="space-y-6">
          {/* Appearance Section */}
          <div className="card">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Appearance
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Customize how ARCH looks and feels across your devices.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleSelectTheme('light')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  selectedTheme === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-border/30 hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-foreground/10 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Light</p>
                  <p className="text-xs text-muted-foreground">Use light theme</p>
                </div>
                {selectedTheme === 'light' && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              <button
                onClick={() => handleSelectTheme('dark')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  selectedTheme === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-border/30 hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-foreground/10 flex items-center justify-center">
                  <Moon className="w-6 h-6 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Dark</p>
                  <p className="text-xs text-muted-foreground">Use dark theme</p>
                </div>
                {selectedTheme === 'dark' && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              <button
                onClick={() => handleSelectTheme('system')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-muted/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-foreground/10 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">System</p>
                  <p className="text-xs text-muted-foreground">Follow system preference</p>
                </div>
              </button>
            </div>

            {/* Confirm Button */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 pt-4 border-t border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Apply Theme
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Account Section */}
          <div className="card">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Account
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Manage your personal information and account settings.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium text-foreground">user@arch.com</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground mb-1">Role</p>
                <p className="text-sm font-medium text-foreground">Employee</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}