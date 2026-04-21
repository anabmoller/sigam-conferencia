export function Input({ label, hint, error, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <label htmlFor={inputId} className="block">
      {label && (
        <span className="block text-sm font-medium text-navy mb-1">{label}</span>
      )}
      <input
        id={inputId}
        className={`w-full rounded-lg border border-sigam-border bg-white px-3 py-2 text-sm text-sigam-text placeholder-sigam-muted focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy ${error ? 'border-burgundy' : ''} ${className}`}
        {...props}
      />
      {hint && !error && (
        <span className="block text-xs text-sigam-muted mt-1">{hint}</span>
      )}
      {error && <span className="block text-xs text-burgundy mt-1">{error}</span>}
    </label>
  );
}
