'use client';

export type AuthNotificationTone = 'message' | 'error';

export type AuthNotification = {
  id?: string;
  message: string;
  tone: AuthNotificationTone;
  title: string;
};

const STORAGE_KEY = 'arch_auth_notifications';
const COOKIE_KEY = 'arch_auth_notification';

function safeParse(value: string | null): AuthNotification[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AuthNotification => {
      return (
        item &&
        typeof item.title === 'string' &&
        typeof item.message === 'string' &&
        (item.tone === 'message' || item.tone === 'error')
      );
    });
  } catch {
    return [];
  }
}

export function queueAuthNotification(notification: Omit<AuthNotification, 'id'>) {
  if (typeof window === 'undefined') return;
  queueAuthNotificationToStorage(window.sessionStorage, notification);
}

export function consumeAuthNotifications(): AuthNotification[] {
  if (typeof window === 'undefined') return [];

  const current = [
    ...safeParse(window.sessionStorage.getItem(STORAGE_KEY)),
    ...consumeAuthNotificationCookie(),
  ];
  window.sessionStorage.removeItem(STORAGE_KEY);
  return current;
}

export function queueAuthNotificationToStorage(
  storage: Storage,
  notification: Omit<AuthNotification, 'id'>
) {
  const current = safeParse(storage.getItem(STORAGE_KEY));
  const next: AuthNotification = {
    ...notification,
    id: crypto.randomUUID(),
  };

  storage.setItem(STORAGE_KEY, JSON.stringify([...current, next]));
}

export function consumeAuthNotificationCookie(): AuthNotification[] {
  if (typeof window === 'undefined') return [];

  const cookieValue = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${COOKIE_KEY}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  if (!cookieValue) return [];

  let parsed: AuthNotification[] = [];
  try {
    parsed = safeParse(decodeURIComponent(cookieValue));
  } catch {
    parsed = [];
  }

  document.cookie = `${COOKIE_KEY}=; Max-Age=0; path=/`;
  return parsed;
}
