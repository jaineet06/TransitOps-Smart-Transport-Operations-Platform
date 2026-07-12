import { cn } from '../../lib/utils';

export default function Select({
  label,
  error,
  id,
  className,
  containerClassName,
  children,
  ...props
}) {
  return (
    <div className={cn('flex flex-col', containerClassName)}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'form-input appearance-none cursor-pointer',
          error && 'form-input-error',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
