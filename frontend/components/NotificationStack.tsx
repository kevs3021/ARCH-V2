'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { AuthNotification } from '@/lib/authNotifications';

type NotificationStackProps = {
  notifications: AuthNotification[];
  onDismiss: (id: string) => void;
};

const toneStyles = {
  message: {
    border: 'border-blue-200/80 dark:border-blue-500/20',
    accent: 'bg-blue-500 dark:bg-blue-400',
    surface: 'bg-blue-50/95 dark:bg-blue-950/85',
    title: 'text-blue-900 dark:text-blue-50',
    body: 'text-blue-950/80 dark:text-blue-100/85',
    close: 'text-blue-600 hover:bg-blue-100/90 hover:text-blue-950 dark:text-blue-200 dark:hover:bg-white/10 dark:hover:text-white',
    track: 'bg-blue-200/70 dark:bg-blue-400/20',
  },
  error: {
    border: 'border-rose-200/85 dark:border-rose-500/20',
    accent: 'bg-rose-500 dark:bg-rose-400',
    surface: 'bg-rose-50/95 dark:bg-rose-950/88',
    title: 'text-rose-900 dark:text-rose-50',
    body: 'text-rose-950/80 dark:text-rose-100/85',
    close: 'text-rose-600 hover:bg-rose-100/90 hover:text-rose-950 dark:text-rose-200 dark:hover:bg-white/10 dark:hover:text-white',
    track: 'bg-rose-200/75 dark:bg-rose-400/20',
  },
} as const;

export default function NotificationStack({ notifications, onDismiss }: NotificationStackProps) {
  return (
    <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,24rem)] flex-col gap-3 pointer-events-none">
      <AnimatePresence initial={false}>
        {notifications.map((notification) => {
          const styles = toneStyles[notification.tone];

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 24, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              onClick={() => onDismiss(notification.id ?? '')}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${styles.border} ${styles.surface} shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl cursor-pointer`}
              role={notification.tone === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              <div className="px-4 pb-4 pt-4">
                <p className={`text-sm font-semibold ${styles.title}`}>{notification.title}</p>
                <p className={`mt-1 text-sm leading-5 ${styles.body}`}>{notification.message}</p>
              </div>

              <div className={`h-1.5 w-full overflow-hidden rounded-b-2xl ${styles.track}`}>
                <div
                  className={`h-full rounded-full ${styles.accent}`}
                  style={{ animation: 'toast-progress 5000ms linear forwards' }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
