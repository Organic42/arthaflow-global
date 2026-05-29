interface ProgressBarProps {
  value?: number;
  color?: string;
  height?: number;
}

export function ProgressBar({
  value = 0,
  color = "bg-action-blue",
  height = 6,
}: ProgressBarProps) {
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-subtle"
      style={{ height }}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}
