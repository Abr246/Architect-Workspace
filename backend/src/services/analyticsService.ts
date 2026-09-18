import { listBookings } from './bookingsService';

export type PeriodTrend = 'busy' | 'slow' | 'normal';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

// Deterministic, rules-based stand-in for "the AI analytics agent" — same
// honest-substitution pattern as STORY-003/006: no LLM/AI API credentials
// exist in this environment. Groups confirmed bookings by day of week
// (UTC — bookings are stored as UTC ISO strings, so classifying by local
// time would make the result depend on which machine runs this) and
// classifies each day relative to the average across all 7 days.
export function generateAnalyticsReport(): AnalyticsReport {
  const confirmedBookings = listBookings('confirmed');

  const countsByDay = new Array(7).fill(0) as number[];
  for (const booking of confirmedBookings) {
    const dayIndex = new Date(booking.startTime).getUTCDay();
    countsByDay[dayIndex] += 1;
  }

  const totalBookings = confirmedBookings.length;
  const average = totalBookings / 7;

  // Every count is classified relative to the same average, by the same
  // rule, every time — this is what makes trend identification correct by
  // construction rather than a guess ("Incorrect trend identification").
  const periods: PeriodAnalysis[] = countsByDay.map((bookingCount, dayIndex) => ({
    dayOfWeek: DAY_NAMES[dayIndex],
    bookingCount,
    trend: classify(bookingCount, average),
  }));

  const report: AnalyticsReport = {
    generatedAt: new Date().toISOString(),
    totalBookings,
    periods,
    summary: buildSummary(periods),
  };

  logReport(report);

  return report;
}

function classify(count: number, average: number): PeriodTrend {
  if (count > average) return 'busy';
  if (count < average) return 'slow';
  return 'normal';
}

function buildSummary(periods: PeriodAnalysis[]): string {
  const busyDays = periods.filter((p) => p.trend === 'busy').map((p) => p.dayOfWeek);
  const slowDays = periods.filter((p) => p.trend === 'slow').map((p) => p.dayOfWeek);

  const parts: string[] = [];
  parts.push(busyDays.length > 0 ? `Busy: ${busyDays.join(', ')}.` : 'No day stands out as busy.');
  parts.push(slowDays.length > 0 ? `Slow: ${slowDays.join(', ')}.` : 'No day stands out as slow.');
  return parts.join(' ');
}

function logReport(report: AnalyticsReport): void {
  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp: report.generatedAt,
        level: 'info',
        service: 'backend',
        event: 'analytics_report_generated',
        outcome: 'success',
        context: {
          dataSource: 'bookings',
          totalBookings: report.totalBookings,
          periodsAnalyzed: report.periods.length,
        },
      }),
    );
  } catch (err) {
    // "Data analysis error" for the report's own logging step must never
    // prevent the report from being returned to the dashboard.
    // eslint-disable-next-line no-console
    console.error('[analytics] ReportLoggingError:', err instanceof Error ? err.message : err);
  }
}
