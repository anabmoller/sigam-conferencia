export function EmptyState({ title, description, action }) {
  return (
    <div className="border border-dashed border-sigam-border rounded-xl p-8 text-center bg-white">
      <h3 className="font-headline text-2xl text-navy mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-sigam-muted mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
