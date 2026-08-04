export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
      <div>
        <h1 className="font-display text-[1.7rem] font-medium leading-tight">{title}</h1>
        {description && <p className="text-graphite-light text-sm mt-1.5 max-w-[60ch]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
