import { useEffect, useState } from 'react';
import { fetchAnalyticsReport, AnalyticsReport } from '../services/analyticsApi';
import { fetchAllBookings, Booking } from '../services/bookingsApi';
import { fetchAvailableFields, Field } from '../services/fieldsApi';
import {
  DateRangeDays,
  buildFieldPerformance,
  buildPeakHours,
  buildTrendBuckets,
  computeAnalyticsSummary,
  formatCurrency,
} from '../utils/analyticsMetrics';

type LoadState = 'loading' | 'error' | 'ready';

const RANGE_OPTIONS: { days: DateRangeDays; label: string }[] = [
  { days: 7, label: '7 Days' },
  { days: 30, label: '30 Days' },
  { days: 90, label: '90 Days' },
];

export function AnalyticsDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [rangeDays, setRangeDays] = useState<DateRangeDays>(7);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAllBookings(), fetchAvailableFields(), fetchAnalyticsReport()])
      .then(([bookingsData, fieldsData, reportData]) => {
        if (cancelled) return;
        setBookings(bookingsData);
        setFields(fieldsData);
        setReport(reportData);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <p className="gk-status">Loading analytics…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load the analytics report right now. Please try again shortly.</p>;
  }

  const summary = computeAnalyticsSummary(bookings, fields, rangeDays);
  const trendBuckets = buildTrendBuckets(bookings, fields, rangeDays);
  const fieldPerformance = buildFieldPerformance(fields, bookings, rangeDays);
  const peakHours = buildPeakHours(bookings, rangeDays);

  const maxBookingCount = Math.max(0, ...trendBuckets.map((b) => b.bookingCount));
  const maxRevenue = Math.max(0, ...trendBuckets.map((b) => b.revenue));
  const maxPeakCount = Math.max(0, ...peakHours.map((p) => p.count));

  return (
    <div className="gk-page">
      <h1>Analytics</h1>
      <p className="gk-page__intro">How your fields and bookings are performing.</p>

      <div className="gk-filter-tabs">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.days}
            type="button"
            className={`gk-filter-tab ${rangeDays === option.days ? 'gk-filter-tab--active' : ''}`}
            onClick={() => setRangeDays(option.days)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="gk-summary-grid">
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">📅</span>
          <span className="gk-summary-card__value">{summary.totalBookings}</span>
          <span className="gk-summary-card__label">Total Bookings</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">💰</span>
          <span className="gk-summary-card__value">{formatCurrency(summary.totalRevenue)}</span>
          <span className="gk-summary-card__label">Total Revenue</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">📊</span>
          <span className="gk-summary-card__value">{formatCurrency(summary.averageBookingValue)}</span>
          <span className="gk-summary-card__label">Average Booking Value</span>
        </div>
        <div className="gk-summary-card">
          <span className="gk-summary-card__icon" aria-hidden="true">🏟️</span>
          <span className="gk-summary-card__value">{summary.utilizationPercent}%</span>
          <span className="gk-summary-card__label">Field Utilization</span>
        </div>
      </div>

      <h2>Booking trends</h2>
      {report && <p className="gk-report-meta">{report.summary}</p>}
      <div className="gk-card">
        {maxBookingCount === 0 ? (
          <p className="gk-empty-row">
            <span className="gk-empty-row__icon" aria-hidden="true">📊</span>
            No bookings in the last {rangeDays} days yet.
          </p>
        ) : (
          <div className="gk-bar-chart">
            {trendBuckets.map((bucket) => (
              <div className="gk-bar-chart__column" key={bucket.label}>
                <span className="gk-bar-chart__value">{bucket.bookingCount}</span>
                <div className="gk-bar-chart__track">
                  <div
                    className="gk-bar-chart__bar gk-bar-chart__bar--primary"
                    style={{ height: `${(bucket.bookingCount / maxBookingCount) * 100}%` }}
                  />
                </div>
                <span className="gk-bar-chart__label">{bucket.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2>Revenue</h2>
      <div className="gk-card">
        {maxRevenue === 0 ? (
          <p className="gk-empty-row">
            <span className="gk-empty-row__icon" aria-hidden="true">💰</span>
            No revenue in the last {rangeDays} days yet.
          </p>
        ) : (
          <div className="gk-bar-chart">
            {trendBuckets.map((bucket) => (
              <div className="gk-bar-chart__column" key={bucket.label}>
                <span className="gk-bar-chart__value">{formatCurrency(bucket.revenue)}</span>
                <div className="gk-bar-chart__track">
                  <div
                    className="gk-bar-chart__bar gk-bar-chart__bar--success"
                    style={{ height: `${(bucket.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="gk-bar-chart__label">{bucket.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2>Field performance</h2>
      <div className="gk-card">
        {fieldPerformance.length === 0 ? (
          <p className="gk-empty-row">
            <span className="gk-empty-row__icon" aria-hidden="true">🏟️</span>
            No fields to show right now.
          </p>
        ) : (
          <table className="gk-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {fieldPerformance.map((row) => (
                <tr key={row.fieldId}>
                  <td>{row.name}</td>
                  <td>{row.bookingCount}</td>
                  <td>{formatCurrency(row.revenue)}</td>
                  <td>{row.utilizationPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Peak booking times</h2>
      <div className="gk-card">
        {maxPeakCount === 0 ? (
          <p className="gk-empty-row">
            <span className="gk-empty-row__icon" aria-hidden="true">🕒</span>
            No bookings in the last {rangeDays} days yet.
          </p>
        ) : (
          <ul className="gk-hbar-chart">
            {peakHours
              .filter((p) => p.count > 0)
              .map((p) => (
                <li className="gk-hbar-chart__row" key={p.hour}>
                  <span className="gk-hbar-chart__label">{p.label}</span>
                  <div className="gk-hbar-chart__track">
                    <div className="gk-hbar-chart__bar" style={{ width: `${(p.count / maxPeakCount) * 100}%` }} />
                  </div>
                  <span className="gk-hbar-chart__value">{p.count}</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
