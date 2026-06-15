import React from 'react';
import { motion } from 'framer-motion';

export default function Button({ children, type = 'button', onClick, className = '', disabled, variant = 'primary' }) {
  const baseStyle = "flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary py-2 px-5 text-xs tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  
  const variants = {
    primary: "bg-primary text-white dark:text-[#202124] hover:opacity-90 focus:ring-primary",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 focus:ring-primary",
    danger: "bg-error text-white hover:opacity-90 focus:ring-error"
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={baseStyle + ' ' + variants[variant] + ' ' + className}
    >
      {children}
    </motion.button>
  );
}
