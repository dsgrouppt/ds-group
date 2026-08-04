export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-16 px-6">
      <p className="font-display text-lg mb-1.5">{title}</p>
      {description && <p className="text-sm text-graphite-light max-w-[42ch] mx-auto">{description}</p>}
    </div>
  );
}
