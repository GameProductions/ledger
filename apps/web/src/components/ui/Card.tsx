import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '', action }) => {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-6">
          <div>
            {title && <h3 className="text-lg font-bold">{title}</h3>}
            {subtitle && <p className="text-[10px] text-secondary uppercase tracking-widest font-bold opacity-60">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};
