import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAuthStore();
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
      title="Toggle Light/Dark Theme"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </motion.div>
    </button>
  );
}
