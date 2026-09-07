import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchedulingIssuesPage } from './SchedulingIssuesPage';

const openIssue = {
  id: 'issue-1',
  type: 'conflict' as const,
  fieldId: 'field-1',
  details: { requestedBy: 'Leo', conflictingBookingId: 'booking-1' },
  status: 'open' as const,
  detectedAt: '2026-09-25T14:30:00.000Z',
  notifiedAt: '2026-09-25T14:30:00.000Z',
  resolvedAt: null,
  resolvedBy: null,
  resolutionNotes: null,
};

function mockFetchJsonOnce(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('SchedulingIssuesPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows open scheduling issues fetched from the API', async () => {
    mockFetchJsonOnce({ issues: [openIssue] });

    render(<SchedulingIssuesPage />);

    await waitFor(() => {
      expect(screen.getByText(/booking conflict/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/leo/i)).toBeInTheDocument();
  });

  it('shows an empty state when nothing needs attention', async () => {
    mockFetchJsonOnce({ issues: [] });

    render(<SchedulingIssuesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no scheduling issues need attention/i)).toBeInTheDocument();
    });
  });

  it('resolving an issue removes it from the list', async () => {
    mockFetchJsonOnce({ issues: [openIssue] });
    render(<SchedulingIssuesPage />);
    await waitFor(() => expect(screen.getByText(/booking conflict/i)).toBeInTheDocument());

    mockFetchJsonOnce({ issue: { ...openIssue, status: 'resolved', resolvedBy: 'Scheduler Sam' } }, 200);

    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Scheduler Sam');
    await userEvent.click(screen.getByRole('button', { name: /mark resolved/i }));

    await waitFor(() => {
      expect(screen.queryByText(/booking conflict/i)).not.toBeInTheDocument();
    });
  });

  it('shows an error and keeps the issue listed if resolving fails', async () => {
    mockFetchJsonOnce({ issues: [openIssue] });
    render(<SchedulingIssuesPage />);
    await waitFor(() => expect(screen.getByText(/booking conflict/i)).toBeInTheDocument());

    mockFetchJsonOnce({ error: 'No scheduling issue found with id issue-1.' }, 404);

    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Scheduler Sam');
    await userEvent.click(screen.getByRole('button', { name: /mark resolved/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no scheduling issue found/i);
    });
    expect(screen.getByText(/booking conflict/i)).toBeInTheDocument();
  });
});
