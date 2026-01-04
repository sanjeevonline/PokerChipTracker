
import React from 'react';
import { X } from 'lucide-react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-red-700 hover:bg-red-600 text-white focus:ring-red-600 shadow-lg shadow-red-900/20",
    secondary: "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 focus:ring-neutral-500 border border-neutral-700",
    danger: "bg-transparent border border-red-900/50 text-red-500 hover:bg-red-900/20 focus:ring-red-900",
    ghost: "bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-white"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs tracking-tight",
    md: "px-4 py-2.5 text-sm uppercase tracking-wider",
    lg: "px-6 py-3.5 text-base uppercase tracking-widest"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[10px] font-black text-neutral-500 mb-1.5 uppercase tracking-[0.15em]">{label}</label>}
      <input 
        className={`w-full bg-neutral-900 border ${error ? 'border-red-500' : 'border-neutral-800'} rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent transition-all sm:text-sm text-base ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
};

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[10px] font-black text-neutral-500 mb-1.5 uppercase tracking-[0.15em]">{label}</label>}
      <div className="relative">
        <select 
          className={`w-full appearance-none bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent transition-all sm:text-sm text-base ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>
  );
};

// --- Card ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, headerAction, ...props }) => {
  return (
    <div 
      className={`bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-sm ${className}`}
      {...props}
    >
      {title && (
        <div className="flex items-center justify-between mb-5 border-b border-neutral-800 pb-3">
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-tight uppercase">
            <span className="w-1.5 h-4 bg-red-600 rounded-full inline-block"></span>
            {title}
          </h3>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`bg-neutral-950 border border-neutral-800 rounded-3xl w-full ${sizeClasses[size]} shadow-2xl shadow-red-950/20 transform transition-all scale-100 max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-900 bg-neutral-900/30 rounded-t-3xl shrink-0">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight uppercase">
            <span className="text-red-600">♦</span> {title}
          </h2>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white rounded-full hover:bg-neutral-800 transition-colors">
            <X size={22} />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
