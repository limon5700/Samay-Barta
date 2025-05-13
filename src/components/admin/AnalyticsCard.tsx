
"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export default function AnalyticsCard({
  title,
  value,
  icon: Icon,
  description,
  className,
}: AnalyticsCardProps) {
  return (
    <Card className={`shadow-md rounded-lg ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
