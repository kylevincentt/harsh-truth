'use client';

import { useEffect } from 'react';

export default function ThemeLoader() {
  useEffect(() => {
    fetch('/api/theme')
      .then((res) => (res.ok ? res.json() : null))
      .then((colors) => {
        if (!colors) return;
        const root = document.documentElement;
        Object.entries(colors).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
      })
      .catch(() => {
        // Silently fail — CSS fallback in globals.css applies
      });
  }, []);

  return null;
}
