import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchedulingIssuesPage } from './SchedulingIssuesPage';

const fields = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true, sizeFormat: '11v11', description: '', amenities: [] },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true, sizeFormat: '7v7', description: '', amenities: [] },
];

const conflictingBooking = {
  id: 'booking-1',
  fieldId: 'field-1',
  customerName: 'John Smith',
  startTime: '2026-09-05T19:00:00.000Z',
  endTime: '2026-09-05T20:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  status: 'confirmed',
};

const openIssue = {
  id: 'issue-1',
  type: 'conflict',
  fieldId: 'field-1',
  details: {
    requestedBy: 'Mike Johnson',
    requestedStartTime: '2026-09-05T19:00:00.000Z',
    requestedEndTime: '2026-09-05T20:00:00.000Z',
    conflictingBookingId: 'booking-1',
  },
  status: 'open',
  detectedAt: '2026-09-01T10:00:00.000Z',
  notifiedAt: '2026-09-01T10:00:00.000Z',
  resolvedAt: null,
  resolvedBy: null,
  resolutionNotes: null,
};

const resolvedIssue = {
  id: 'issue-2',
  type: 'conflict',
  fieldId: 'field-2',
  details: {
    requestedBy: 'Leo',
    requestedStartTime: '2026-08-01T18:00:00.000Z',
    requestedEndTime: '2026-08-01T19:00:00.000Z',
    conflictingBookingId: 'booking-99',
  },
  status: 'resolved',
  detectedAt: '2026-08-01T09:00:00.000Z',
  notifiedAt: '2026-08-01T09:00:00.000Z',
  resolvedAt: '2026-08-01T12:00:00.000Z',
  resolvedBy: 'Manager Mo',
  resolutionNotes: null,
};

function mockFetch(overrides: {
  issues?: unknown[];
  bookings?: unknown[];
  fail?: boolean;
  resolveResponse?: { body: unknown; status?: number };
}) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (overrides.fail) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    }
    if (url.includes('/api/scheduling-issues') && method === 'POST') {
      const { body, status = 200 } = overrides.resolveResponse ?? { body: {} };
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
    }
    if (url.includes('/api/scheduling-issues')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ issues: overrides.issues ?? [] }) } as Response);
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ bookings: overrides.bookings ?? [] }) } as Response);
    }
    if (url.includes('/api/fields')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ fields }) } as Response);
    }
    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  }) as typeof fetch);
}

describe('SchedulingIssuesPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the full empty state when there are no issues at all', async () => {
    mockFetch({ issues: [] });

    render(<SchedulingIssuesPage onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/all schedules look good/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no scheduling conflicts require your attention/i)).toBeInTheDocument();
    expect(screen.getByText(/all fields are currently scheduled without conflicts/i)).toBeInTheDocument();
  });

  it('shows real summary counts and an open issue as a card', async () => {
    mockFetch({ issues: [openIssue], bookings: [conflictingBooking] });

    render(<SchedulingIssuesPage onNavigate={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('⚠️ Double Booking Detected')).toBeInTheDocument());

    const activeCard = screen.getByText('Active Issues').closest('.gk-summary-card');
    expect(activeCard).toHaveTextContent('1');

    expect(screen.getByText('Riverside Pitch')).toBeInTheDocument();
    expect(screen.getByText(/mike johnson tried to book/i)).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('filtering by Resolved shows only resolved issues, and Maintenance always shows none', async () => {
    mockFetch({ issues: [openIssue, resolvedIssue], bookings: [conflictingBooking] });

    render(<SchedulingIssuesPage onNavigate={jest.fn()} />);
    // Both the open and resolved issue render under the default "All"
    // filter, so there are 2 matching cards at this point already.
    await waitFor(() => expect(screen.getAllByText('⚠️ Double Booking Detected')).toHaveLength(2));

    await userEvent.click(screen.getByRole('button', { name: 'Resolved' }));
    expect(screen.queryByRole('button', { name: /resolve issue/i })).not.toBeInTheDocument();
    const issuesList = document.querySelector('.gk-issues-list') as HTMLElement;
    expect(within(issuesList).getByText('Downtown Turf')).toBeInTheDocument();
    expect(within(issuesList).getByText('Resolved')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Maintenance' }));
    expect(screen.getByText(/no issues match this filter/i)).toBeInTheDocument();
  });

  it('"View Bookings" navigates to the All Bookings page', async () => {
    mockFetch({ issues: [openIssue], bookings: [conflictingBooking] });
    const onNavigate = jest.fn();

    render(<SchedulingIssuesPage onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('⚠️ Double Booking Detected')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /view bookings/i }));
    expect(onNavigate).toHaveBeenCalledWith('bookings');
  });

  it('opens the resolve modal showing both the real and the declined booking, and marking resolved removes the issue from the open list', async () => {
    mockFetch({
      issues: [openIssue],
      bookings: [conflictingBooking],
      resolveResponse: { body: { issue: { ...openIssue, status: 'resolved', resolvedBy: 'Manager Mo' } } },
    });

    render(<SchedulingIssuesPage onNavigate={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('⚠️ Double Booking Detected')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /resolve issue/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('John Smith')).toBeInTheDocument();
    expect(within(dialog).getByText('Mike Johnson')).toBeInTheDocument();
    expect(within(dialog).getByText(/never created/i)).toBeInTheDocument();

    mockFetch({ issues: [{ ...openIssue, status: 'resolved' }], bookings: [conflictingBooking], resolveResponse: { body: { issue: {} } } });

    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /resolve issue/i })).not.toBeInTheDocument();
    });
  });

  it('shows an error and keeps the issue open if resolving fails', async () => {
    mockFetch({
      issues: [openIssue],
      bookings: [conflictingBooking],
      resolveResponse: { body: { error: 'No scheduling issue found with id issue-1.' }, status: 404 },
    });

    render(<SchedulingIssuesPage onNavigate={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('⚠️ Double Booking Detected')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /resolve issue/i }));

    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no scheduling issue found/i);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an error state when loading fails', async () => {
    mockFetch({ fail: true });

    render(<SchedulingIssuesPage onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
