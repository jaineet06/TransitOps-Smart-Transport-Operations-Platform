import { cn } from '../../lib/utils';

export default function Input({
  label,
  error,
  id,
  className,
  containerClassName,
  ...props
}) {
  return (
    <div className={cn('flex flex-col', containerClassName)}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn('form-input', error && 'form-input-error', className)}
        {...props}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
