import { listBookings, getBookingsVersion } from './bookingsService';
import { recordAuditEntry } from './auditTrailService';

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

// STORY-010: this report rescans every booking on every call, and is hit
// from three places (this route, the assistant's trends answers, the
// customer-service flow) — cache it, keyed on bookingsService's version
// counter rather than a blind time-based TTL, so repeated calls with no
// new bookings are instant while a real booking change always invalidates
// it. A TTL alone could serve stale busy/slow trends right after a
// booking — that would be "Incorrect trend identification" again, just
// introduced by the optimization itself.
let cachedReport: { report: AnalyticsReport; version: number } | null = null;

// Deterministic, rules-based stand-in for "the AI analytics agent" — same
// honest-substitution pattern as STORY-003/006: no LLM/AI API credentials
// exist in this environment. Groups confirmed bookings by day of week
// (UTC — bookings are stored as UTC ISO strings, so classifying by local
// time would make the result depend on which machine runs this) and
// classifies each day relative to the average across all 7 days.
export function generateAnalyticsReport(): AnalyticsReport {
  const currentVersion = getBookingsVersion();
  if (cachedReport && cachedReport.version === currentVersion) {
    logCacheHit(currentVersion);
    return cachedReport.report;
  }

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

  cachedReport = { report, version: currentVersion };

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

function logCacheHit(version: number): void {
  const timestamp = new Date().toISOString();

  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp,
        level: 'info',
        service: 'backend',
        event: 'analytics_report_cache_hit',
        outcome: 'success',
        context: { bookingsVersion: version },
      }),
    );
  } catch (err) {
    // A logging failure here must never fall back to an unnecessary
    // recompute — the cached report is still correct.
    // eslint-disable-next-line no-console
    console.error('[analytics] CacheHitLoggingError:', err instanceof Error ? err.message : err);
  }

  try {
    // STORY-010 Trust criterion: the optimization itself (serving from
    // cache instead of recomputing) is the "performance optimization
    // applied" this criterion asks about — record it in the audit trail,
    // not just console. A failure here (the "Optimization logs are
    // missing from the audit trail" failure path) must never turn a fast
    // cache hit into a failed request — the report is already known-good.
    recordAuditEntry({
      entityType: 'performance_optimization',
      entityId: `analytics-cache-v${version}`,
      action: 'cache_hit',
      actor: 'system',
      details: { optimization: 'analytics_report_cache', bookingsVersion: version },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[analytics] CacheHitAuditTrailError:', err instanceof Error ? err.message : err);
  }
}

// Test-only: the cache persists across test cases within a module, same
// reason every other service in this build has a resetX().
export function resetAnalyticsCache(): void {
  cachedReport = null;
}
