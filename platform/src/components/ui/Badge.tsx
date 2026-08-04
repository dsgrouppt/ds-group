type Tone = "neutral" | "gold" | "danger" | "success";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-mist text-graphite",
  gold: "bg-gold/10 text-gold-text",
  danger: "bg-danger/10 text-danger-text",
  success: "bg-success/10 text-success-text",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
