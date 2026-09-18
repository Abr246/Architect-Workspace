import { render, screen, waitFor } from '@testing-library/react';
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

function mockFetchJsonOnce(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('AnalyticsDashboardPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the fetched trends, including a busy day and a slow day', async () => {
    mockFetchJsonOnce(sampleReport);

    render(<AnalyticsDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(sampleReport.summary)).toBeInTheDocument();
    });

    // Acceptance criterion 1: trends displayed on the dashboard.
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    // Acceptance criterion 2: a slow period is identified.
    const sundayRow = screen.getByText('Sunday').closest('tr');
    expect(sundayRow).toHaveTextContent('slow');
    const saturdayRow = screen.getByText('Saturday').closest('tr');
    expect(saturdayRow).toHaveTextContent('busy');
  });

  it('shows an error message rather than crashing when the report cannot be loaded', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));

    render(<AnalyticsDashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
