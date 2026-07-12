import { cn } from '../../lib/utils';

/**
 * colorConfig: { bg, text, dot } — Tailwind class strings
 * Pass colorConfig OR use the predefined STATUS_COLORS maps from constants.js
 */
export default function Badge({ label, colorConfig, className }) {
  if (!colorConfig) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-base-700 text-ink-muted', className)}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
        colorConfig.bg,
        colorConfig.text,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colorConfig.dot)} />
      {label}
    </span>
  );
}
