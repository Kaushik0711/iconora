import React from 'react';
import Link from 'next/link';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: React.ReactNode;
}

type ActionButtonProps = BaseButtonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> & {
    href?: undefined;
  };

type LinkButtonProps = BaseButtonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps | 'href'> & {
    href: string;
  };

export type ButtonProps = ActionButtonProps | LinkButtonProps;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm border border-transparent',
  secondary:
    'bg-[var(--color-bg-secondary)] text-[var(--color-heading)] hover:bg-[#EDEFF8] border border-[var(--color-border)]',
  outline:
    'bg-transparent text-[var(--color-heading)] border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]',
  ghost:
    'bg-transparent text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:bg-[var(--color-bg-secondary)] border border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)]',
  md: 'px-4 py-2 text-sm font-semibold rounded-[var(--radius-md)]',
  lg: 'px-6 py-2.5 text-base font-semibold rounded-[var(--radius-md)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  href,
  ...rest
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-sans tracking-tight cursor-pointer transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2';
  const combinedClasses = `${baseClasses} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

  if (href) {
    const linkProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link href={href} className={combinedClasses} {...linkProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={combinedClasses} {...buttonProps}>
      {children}
    </button>
  );
}

