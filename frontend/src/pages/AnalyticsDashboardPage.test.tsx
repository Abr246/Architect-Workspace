import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsDashboardPage } from './AnalyticsDashboardPage';

const sampleReport = {
  generatedAt: '2026-09-18T22:52:57.203Z',
  totalBookings: 4,
  periods: [
    { dayOfWeek: 'Sunday', bookingCount: 0, trend: 'slow' },
    { dayOfWeek: 'Monday', bookingCount: 0, trend: 'slow' },
    { dayOfWeek: 'Tuesday', bookingCount: 1, trend: 'busy' },
    { dayOfWeek: 'Wednesday', bookingCount: 0, trend: 'slow' },
    { dayOfWeek: 'Thursday', bookingCount: 0, trend: 'slow' },
    { dayOfWeek: 'Friday', bookingCount: 0, trend: 'slow' },
    { dayOfWeek: 'Saturday', bookingCount: 3, trend: 'busy' },
  ],
  summary: 'Busy: Tuesday, Saturday. Slow: Sunday, Monday, Wednesday, Thursday, Friday.',
};

const fields = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true, sizeFormat: '11v11', description: '', amenities: [] },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 60, available: true, sizeFormat: '7v7', description: '', amenities: [] },
];

// Dynamic, relative to whenever the suite actually runs - a hardcoded date
// would silently drift into the wrong range bucket as the calendar moves on
// (the same lesson already learned the hard way earlier in this project).
function daysAgoIso(days: number, hour = 19): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function booking(overrides: Partial<(typeof fields)[number]> & Record<string, unknown>) {
  return {
    id: 'booking-1',
    fieldId: 'field-1',
    customerName: 'John Smith',
    startTime: daysAgoIso(1),
    endTime: daysAgoIso(1, 20),
    createdAt: daysAgoIso(2),
    status: 'confirmed',
    ...overrides,
  };
}

function mockFetch(overrides: { bookings?: unknown[]; fields?: unknown[]; report?: unknown; fail?: boolean }) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL) => {
    const url = String(input);

    if (overrides.fail) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ bookings: overrides.bookings ?? [] }) } as Response);
    }
    if (url.includes('/api/fields')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ fields: overrides.fields ?? fields }) } as Response);
    }
    if (url.includes('/api/analytics/report')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(overrides.report ?? sampleReport) } as Response);
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch);
}

describe('AnalyticsDashboardPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('still shows the busy/slow trend summary from the existing analytics report (STORY-007)', async () => {
    mockFetch({ bookings: [], fields });

    render(<AnalyticsDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(sampleReport.summary)).toBeInTheDocument();
    });
  });

  it('shows real summary cards for total bookings, total revenue, average booking value, and utilization', async () => {
    const bookings = [
      booking({ id: 'b1', fieldId: 'field-1', startTime: daysAgoIso(1), endTime: daysAgoIso(1, 20) }), // $40
      booking({ id: 'b2', fieldId: 'field-2', startTime: daysAgoIso(2), endTime: daysAgoIso(2, 20) }), // $60
    ];
    mockFetch({ bookings, fields });

    render(<AnalyticsDashboardPage />);

    await waitFor(() => expect(screen.getByText('Total Bookings').closest('.gk-summary-card')).toHaveTextContent('2'));
    expect(screen.getByText('Total Revenue').closest('.gk-summary-card')).toHaveTextContent('$100');
    expect(screen.getByText('Average Booking Value').closest('.gk-summary-card')).toHaveTextContent('$50');
    expect(screen.getByText('Field Utilization').closest('.gk-summary-card')).toHaveTextContent('%');
  });

  it('updates the figures when switching to a wider date range that includes older real bookings', async () => {
    const bookings = [booking({ id: 'old', startTime: daysAgoIso(20), endTime: daysAgoIso(20, 20) })];
    mockFetch({ bookings, fields });

    render(<AnalyticsDashboardPage />);
    await waitFor(() => expect(screen.getByText('Total Bookings').closest('.gk-summary-card')).toHaveTextContent('0'));

    await userEvent.click(screen.getByRole('button', { name: '30 Days' }));

    await waitFor(() => expect(screen.getByText('Total Bookings').closest('.gk-summary-card')).toHaveTextContent('1'));
  });

  it('shows clean empty states for the charts instead of fabricated numbers when there are no bookings in range', async () => {
    mockFetch({ bookings: [], fields });

    render(<AnalyticsDashboardPage />);

    // Both the Booking Trends and Peak Booking Times sections render this
    // same honest empty-state message, since they're both driven by the
    // same "zero bookings in range" fact - so there are 2 matches, not 1.
    await waitFor(() => {
      expect(screen.getAllByText(/no bookings in the last 7 days yet/i)).toHaveLength(2);
    });
    expect(screen.getByText(/no revenue in the last 7 days yet/i)).toBeInTheDocument();
  });

  it('lists every field in field performance, including an honest zero row for one with no bookings in range', async () => {
    const bookings = [booking({ fieldId: 'field-2', startTime: daysAgoIso(1), endTime: daysAgoIso(1, 20) })];
    mockFetch({ bookings, fields });

    render(<AnalyticsDashboardPage />);

    await waitFor(() => expect(screen.getByText('Downtown Turf')).toBeInTheDocument());
    const riversideRow = screen.getByText('Riverside Pitch').closest('tr');
    expect(riversideRow).toHaveTextContent('0');
    expect(riversideRow).toHaveTextContent('$0');
  });

  it('shows a peak booking times bar for an hour that actually has a booking', async () => {
    const bookings = [booking({ startTime: daysAgoIso(1, 19), endTime: daysAgoIso(1, 20) })];
    mockFetch({ bookings, fields });

    render(<AnalyticsDashboardPage />);

    await waitFor(() => expect(screen.getByText('7:00 PM')).toBeInTheDocument());
  });

  it('shows an error message rather than crashing when the report cannot be loaded', async () => {
    mockFetch({ fail: true });

    render(<AnalyticsDashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
