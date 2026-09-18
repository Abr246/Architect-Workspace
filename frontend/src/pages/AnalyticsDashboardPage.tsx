import { useEffect, useState } from 'react';
import { fetchAnalyticsReport, AnalyticsReport } from '../services/analyticsApi';

type LoadState = 'loading' | 'error' | 'ready';

export function AnalyticsDashboardPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    fetchAnalyticsReport()
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setState('ready');
      })
      .catch(() => {
        // "Dashboard display error" — fail into an honest error state
        // rather than showing a blank or broken page.
        if (cancelled) return;
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <p>Loading analytics…</p>;
  }

  if (state === 'error' || !report) {
    return <p role="alert">Couldn't load the analytics report right now. Please try again shortly.</p>;
  }

  return (
    <div>
      <h1>Booking trends</h1>
      <p>{report.summary}</p>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Bookings</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {report.periods.map((period) => (
            <tr key={period.dayOfWeek}>
              <td>{period.dayOfWeek}</td>
              <td>{period.bookingCount}</td>
              <td>{period.trend}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Based on {report.totalBookings} booking{report.totalBookings === 1 ? '' : 's'}. Report generated{' '}
        {new Date(report.generatedAt).toLocaleString()}.
      </p>
    </div>
  );
}
