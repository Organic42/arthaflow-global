import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="mb-2 text-xl font-bold text-text-heading">{title}</h3>
      {description && (
        <p className="mb-6 max-w-[400px] text-sm text-text-secondary">
          {description}
        </p>
      )}
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  );
}
