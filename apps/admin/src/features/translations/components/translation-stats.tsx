import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useTranslationStats } from '../hooks/use-translations';
import { cn } from '@/lib/utils';

interface TranslationStatsProps {
  className?: string;
}

export function TranslationStats({ className }: TranslationStatsProps) {
  const { data: stats, isLoading } = useTranslationStats();

  if (isLoading) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const approvalRate = stats.totalTranslations > 0
    ? Math.round((stats.approvedCount / stats.totalTranslations) * 100)
    : 0;

  const statCards = [
    {
      title: 'Total Keys',
      value: stats.totalKeys,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Draft',
      value: stats.draftCount,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Pending Review',
      value: stats.pendingCount,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Approved',
      value: stats.approvedCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-full", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approval Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Overall Approval Rate</p>
              <p className="text-sm font-medium">{approvalRate}%</p>
            </div>
            <Progress value={approvalRate} className="h-2" />
          </div>

          {/* Locale Coverage */}
          {Object.keys(stats.localeCoverage).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Coverage by Locale
              </p>
              {Object.entries(stats.localeCoverage).map(([locale, coverage]) => {
                const coverageRate = coverage.total > 0
                  ? Math.round((coverage.approved / coverage.total) * 100)
                  : 0;
                return (
                  <div key={locale} className="flex items-center justify-between text-sm">
                    <span>{locale}</span>
                    <span className="text-muted-foreground">
                      {coverage.approved}/{coverage.total} ({coverageRate}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}