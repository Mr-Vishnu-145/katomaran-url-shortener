import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = forwardRef(({ label, id, type = 'text', value, onChange, placeholder, className = '', error, required, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className="relative w-full">
        <input
          id={id}
          ref={ref}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={"w-full bg-slate-100/50 dark:bg-slate-900/50 border " + (error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 dark:border-slate-800 focus:border-primary focus:ring-primary/20') + " focus:ring-4 rounded-xl py-2.5 px-4 text-xs font-medium text-slate-950 dark:text-slate-50 outline-none transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-550 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/60 disabled:text-slate-400 dark:disabled:text-slate-550 disabled:border-slate-200 dark:disabled:border-slate-800/60 " + (isPassword ? 'pr-10 ' : '') + className}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
            tabIndex="-1"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <span className="text-xs text-error font-medium leading-none mt-1">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
