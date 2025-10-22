import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GlassmorphicCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassmorphicCard({ children, className }: GlassmorphicCardProps) {
  return (
    <Card className={cn("glass border-0", className)}>
      {children}
    </Card>
  );
}

GlassmorphicCard.Header = CardHeader;
GlassmorphicCard.Title = CardTitle;
GlassmorphicCard.Description = CardDescription;
GlassmorphicCard.Content = CardContent;
GlassmorphicCard.Footer = CardFooter;
