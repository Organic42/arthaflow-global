interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
}

export function StatCard({ label, value, suffix, color = "text-action-blue" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-4xl font-bold leading-tight ${color}`}>
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-text-muted">{suffix}</span>
        )}
      </div>
    </div>
  );
}
