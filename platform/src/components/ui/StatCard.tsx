export function StatCard({
  label,
  value,
  suffix,
  hint,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  hint?: string;
}) {
  const display = value === null || value === undefined || value === "" ? "—" : value;
  return (
    <div className="bg-white border border-mist-2 rounded-lg p-6">
      <div className="text-xs font-medium text-graphite-light uppercase tracking-wide mb-3">{label}</div>
      <div className="font-display text-[2rem] leading-none">
        {display}
        {suffix && display !== "—" ? <span className="text-graphite-light text-lg ml-1">{suffix}</span> : null}
      </div>
      {hint && <div className="text-xs text-graphite-light mt-2">{hint}</div>}
    </div>
  );
}
