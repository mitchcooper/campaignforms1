import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "primary" | "cyan" | "success" | "warning";
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, variant = "primary", description, className }: StatCardProps) {
  const variantClasses = {
    primary: "bg-primary text-primary-foreground",
    cyan: "bg-[hsl(195,100%,47%)] text-white",
    success: "bg-[hsl(142,71%,45%)] text-white",
    warning: "bg-[hsl(38,92%,50%)] text-white",
  };

  return (
    <Card className={cn("border-0", variantClasses[variant], className)} data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider opacity-90">{title}</h3>
          <Icon className="h-5 w-5 opacity-80" />
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-sm opacity-80">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
