'use client';

import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Check local storage or system preference
    const saved = localStorage.getItem('theme');
    const isLight = saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches);
    if (isLight) {
      document.documentElement.classList.add('light');
      setTheme('light');
    } else {
      document.documentElement.classList.remove('light');
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 border border-border-custom hover:border-text-primary hover:text-text-primary rounded-md transition-all text-text-secondary cursor-pointer flex items-center justify-center w-8 h-8 bg-bg-surface"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        // Sun Icon for dark mode (click to make light)
        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 15a5 5 0 110-10 5 5 0 010 10zm0-1.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0-11.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2zm0 13.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zm8.25-6.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 000 1.5h1.5a.75.75 0 00.75-.75zM4 10a.75.75 0 01-.75.75H1.75a.75.75 0 010-1.5h1.5A.75.75 0 014 10zm11.838-6.338a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM6.282 13.718a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zm9.556 0a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM5.222 3.662a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06L4.162 4.722a.75.75 0 010-1.06z" />
        </svg>
      ) : (
        // Moon Icon for light mode (click to make dark)
        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
