export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-sigam-card border border-sigam-border rounded-xl shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }) {
  return <div className={`p-4 border-b border-sigam-border ${className}`}>{children}</div>;
}

export function CardBody({ className = '', children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
