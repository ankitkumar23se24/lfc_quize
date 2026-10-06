import { useEffect, useState } from 'react';
export default function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') ? localStorage.getItem('theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light'); }, [dark]);
  return <button aria-label="Toggle theme" onClick={() => setDark(!dark)} className="fixed top-3 right-3 z-50 rounded-full bg-white dark:bg-stone-800 shadow w-10 h-10">{dark ? '☀️' : '🌙'}</button>;
}
