import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={
        "glass-panel glow-border rounded-2xl p-6 shadow-sm transition-all duration-300 " +
        (onClick 
          ? 'cursor-pointer hover:scale-[1.015] hover:-translate-y-1 active:scale-[0.98]' 
          : 'hover:-translate-y-0.5') + 
        " " + className
      }
    >
      {children}
    </div>
  );
}

