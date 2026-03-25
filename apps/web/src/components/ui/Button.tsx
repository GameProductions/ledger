import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[10px] gap-2";
  
  const variants = {
    primary: "bg-primary text-white hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    secondary: "bg-secondary text-white hover:brightness-110 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]",
    glass: "bg-white/5 border border-glass-border text-white hover:bg-white/10 hover:border-primary/50",
    danger: "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
  };

  const sizes = {
    sm: "px-3 py-1.5 rounded-lg",
    md: "px-6 py-3 rounded-xl",
    lg: "px-8 py-4 rounded-2xl text-xs"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </button>
  );
};
