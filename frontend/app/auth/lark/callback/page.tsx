'use client';

import { useEffect } from 'react';
import { queueAuthNotificationToStorage } from '@/lib/authNotifications';

export default function LarkCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error || !code) {
      const storage = window.opener?.sessionStorage ?? window.sessionStorage;
      queueAuthNotificationToStorage(storage, {
        tone: 'error',
        title: 'Login Error',
        message: 'Lark login was cancelled or denied.',
      });
      if (window.opener) {
        window.close();
      } else {
        window.location.href = '/login';
      }
      return;
    }

    const isPopup = !!window.opener;

    fetch('/api/auth/lark/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (isPopup) {
            window.close();
          }
          window.location.href = data.redirectTo;
        } else {
          const storage = window.opener?.sessionStorage ?? window.sessionStorage;
          queueAuthNotificationToStorage(storage, {
            tone: 'error',
            title: 'Login Error',
            message: data.error || 'An unexpected error occurred during login.',
          });
          if (isPopup) {
            window.close();
          } else {
            window.location.href = '/login';
          }
        }
      })
      .catch(() => {
        const storage = window.opener?.sessionStorage ?? window.sessionStorage;
        queueAuthNotificationToStorage(storage, {
          tone: 'error',
          title: 'Login Error',
          message: 'An unexpected error occurred during login.',
        });
        if (isPopup) {
          window.close();
        } else {
          window.location.href = '/login';
        }
      });
  }, []);

  return <div>Processing Lark login...</div>;
}
