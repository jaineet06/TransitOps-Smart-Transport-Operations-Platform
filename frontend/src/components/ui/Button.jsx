import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover border-transparent',
  secondary: 'bg-base-700 text-ink hover:bg-base-600 border-base-600',
  ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-base-800 border-transparent',
  danger: 'bg-danger text-white hover:bg-danger-hover border-transparent',
  outline: 'bg-transparent text-ink border-base-600 hover:border-accent hover:text-accent',
};

const sizes = {
  sm: 'px-2.5 py-1 text-xs h-7',
  md: 'px-3.5 py-1.5 text-sm h-8',
  lg: 'px-5 py-2 text-sm h-10',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded border',
        'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-3.5 w-3.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}
