const VARIANTS = {
  primary: 'bg-navy text-white hover:bg-navy/90 disabled:bg-navy/40',
  accent: 'bg-mustard text-navy hover:brightness-95 disabled:opacity-50',
  danger: 'bg-burgundy text-white hover:bg-burgundy/90 disabled:bg-burgundy/40',
  ghost: 'bg-transparent text-navy hover:bg-sigam-border/60',
  outline: 'bg-white text-navy border border-sigam-border hover:bg-sigam-bg',
};

export function Button({ as: As = 'button', variant = 'primary', className = '', children, ...props }) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition disabled:cursor-not-allowed ${v} ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}
