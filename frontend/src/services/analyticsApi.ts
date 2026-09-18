export type PeriodTrend = 'busy' | 'slow' | 'normal';

export interface PeriodAnalysis {
  dayOfWeek: string;
  bookingCount: number;
  trend: PeriodTrend;
}

export interface AnalyticsReport {
  generatedAt: string;
  totalBookings: number;
  periods: PeriodAnalysis[];
  summary: string;
}

export async function fetchAnalyticsReport(): Promise<AnalyticsReport> {
  const res = await fetch('/api/analytics/report');
  if (!res.ok) {
    throw new Error(`Failed to load analytics report (status ${res.status})`);
  }
  return res.json();
}
