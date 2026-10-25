import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from './NotificationBell';

const fields = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true, sizeFormat: '11v11', description: '', amenities: [] },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true, sizeFormat: '7v7', description: '', amenities: [] },
];

const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

function todayAt(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const bookingCreatedEntry = {
  id: 'audit-1',
  entityType: 'booking',
  entityId: 'booking-1',
  action: 'created',
  actor: 'Alice',
  timestamp: twoHoursAgo,
  details: { fieldId: 'field-1', startTime: todayAt(19), endTime: todayAt(20) },
};

const bookingCancelledEntry = {
  id: 'audit-2',
  entityType: 'booking',
  entityId: 'booking-2',
  action: 'cancelled',
  actor: 'Bob',
  timestamp: oneHourAgo,
  details: { fieldId: 'field-1', startTime: todayAt(16), endTime: todayAt(17) },
};

const issueDetectedEntry = {
  id: 'audit-3',
  entityType: 'scheduling_issue',
  entityId: 'issue-1',
  action: 'detected',
  actor: 'system',
  timestamp: oneHourAgo,
  details: { fieldId: 'field-2', requestedStartTime: todayAt(18) },
};

const decisionEntry = {
  id: 'audit-4',
  entityType: 'customer_issue',
  entityId: 'escalation-1',
  action: 'resolved',
  actor: 'Manager Mo',
  timestamp: oneHourAgo,
  details: { decision: 'approved', notes: null, customerNotified: true },
};

const aiResolvedEntry = {
  id: 'audit-5',
  entityType: 'customer_issue',
  entityId: 'issue-ai-1',
  action: 'resolved',
  actor: 'Taylor',
  timestamp: twoHoursAgo,
  details: { issue: 'Is Downtown Turf available?', resolution: 'Yes', escalationId: null },
};

const approvedEscalation = {
  id: 'escalation-1',
  type: 'refund',
  customerName: 'Jordan',
  description: 'Refund please',
  status: 'approved',
  createdAt: twoHoursAgo,
  decidedAt: oneHourAgo,
  decidedBy: 'Manager Mo',
  decisionNotes: null,
  customerNotifiedAt: oneHourAgo,
};

const upcomingBooking = {
  id: 'booking-3',
  fieldId: 'field-2',
  customerName: 'Priya',
  startTime: inTwoHours,
  endTime: new Date(new Date(inTwoHours).getTime() + 60 * 60 * 1000).toISOString(),
  createdAt: twoHoursAgo,
  status: 'confirmed',
};

function mockFetch(overrides: {
  bookings?: unknown[];
  bookingEntries?: unknown[];
  issueEntries?: unknown[];
  customerIssueEntries?: unknown[];
  escalations?: unknown[];
  fail?: boolean;
}) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL) => {
    const url = String(input);
    if (overrides.fail) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    }
    if (url.includes('/api/fields')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ fields }) } as Response);
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ bookings: overrides.bookings ?? [] }) } as Response);
    }
    if (url.includes('entityType=booking')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ entries: overrides.bookingEntries ?? [] }) } as Response);
    }
    if (url.includes('entityType=scheduling_issue')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ entries: overrides.issueEntries ?? [] }) } as Response);
    }
    if (url.includes('entityType=customer_issue')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ entries: overrides.customerIssueEntries ?? [] }) } as Response);
    }
    if (url.includes('/api/escalations')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ escalations: overrides.escalations ?? [] }) } as Response);
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch);
}

async function flushMicrotasks(times = 8) {
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('NotificationBell', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('shows an unread badge counting all notifications when nothing has been read yet', async () => {
    mockFetch({ bookingEntries: [bookingCreatedEntry, bookingCancelledEntry] });

    render(<NotificationBell onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/notifications, 2 unread/i)).toBeInTheDocument();
    });
  });

  it('opens the panel on click and shows no badge when there is nothing to report', async () => {
    mockFetch({});

    render(<NotificationBell onNavigate={jest.fn()} />);
    await flushMicrotasks();

    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
  });

  it('shows a correctly formatted title and subtitle for each real notification category', async () => {
    mockFetch({
      bookingEntries: [bookingCreatedEntry, bookingCancelledEntry],
      issueEntries: [issueDetectedEntry],
      customerIssueEntries: [decisionEntry, aiResolvedEntry],
      escalations: [approvedEscalation],
      bookings: [upcomingBooking],
    });

    render(<NotificationBell onNavigate={jest.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/notifications, \d+ unread/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByText('New booking request')).toBeInTheDocument();
    expect(screen.getByText(/riverside pitch • today at 7:00 pm/i)).toBeInTheDocument();

    expect(screen.getByText('Booking canceled')).toBeInTheDocument();
    expect(screen.getByText(/riverside pitch • today at 4:00 pm/i)).toBeInTheDocument();

    expect(screen.getByText('Scheduling conflict detected')).toBeInTheDocument();
    expect(screen.getByText(/downtown turf • today at 6:00 pm/i)).toBeInTheDocument();

    expect(screen.getByText('Request approved')).toBeInTheDocument();
    expect(screen.getByText(/jordan's refund/i)).toBeInTheDocument();

    expect(screen.getByText('Upcoming booking')).toBeInTheDocument();
    expect(screen.getByText(/downtown turf • in 2 hours/i)).toBeInTheDocument();

    // The AI-instant-resolution entry (no `decision` field) must never show
    // up as its own approve/deny notification - same dedup rule as the
    // Dashboard, proven here to genuinely come from the one shared module.
    expect(screen.queryByText(/taylor/i)).not.toBeInTheDocument();
  });

  it('clicking a notification marks it read, closes the panel, and navigates to the right page', async () => {
    mockFetch({ bookingEntries: [bookingCreatedEntry] });
    const onNavigate = jest.fn();

    render(<NotificationBell onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByLabelText(/notifications, 1 unread/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await userEvent.click(screen.getByText('New booking request'));

    expect(onNavigate).toHaveBeenCalledWith('bookings');
    expect(screen.queryByText('New booking request')).not.toBeInTheDocument(); // panel closed
    await waitFor(() => expect(screen.queryByText(/unread/)).not.toBeInTheDocument());
  });

  it('routes a scheduling conflict notification to the scheduling-issues page and a decision to interactions', async () => {
    mockFetch({ issueEntries: [issueDetectedEntry], customerIssueEntries: [decisionEntry], escalations: [approvedEscalation] });
    const onNavigate = jest.fn();

    render(<NotificationBell onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByLabelText(/notifications, 2 unread/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('Scheduling conflict detected'));
    expect(onNavigate).toHaveBeenCalledWith('scheduling-issues');

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('Request approved'));
    expect(onNavigate).toHaveBeenCalledWith('interactions');
  });

  it('"Mark all as read" clears the unread count and is disabled once nothing is unread', async () => {
    mockFetch({ bookingEntries: [bookingCreatedEntry, bookingCancelledEntry] });

    render(<NotificationBell onNavigate={jest.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/notifications, 2 unread/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));

    const markAllButton = screen.getByRole('button', { name: /mark all as read/i });
    expect(markAllButton).not.toBeDisabled();

    await userEvent.click(markAllButton);

    await waitFor(() => expect(screen.queryByText(/unread/)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeDisabled();
  });

  it('read state persists across a remount (localStorage), not just in-memory', async () => {
    mockFetch({ bookingEntries: [bookingCreatedEntry] });

    const { unmount } = render(<NotificationBell onNavigate={jest.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/notifications, 1 unread/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await userEvent.click(screen.getByText('New booking request'));
    unmount();

    mockFetch({ bookingEntries: [bookingCreatedEntry] });
    render(<NotificationBell onNavigate={jest.fn()} />);

    await flushMicrotasks();
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it('shows a graceful empty/error state instead of crashing when the data fails to load', async () => {
    mockFetch({ fail: true });

    render(<NotificationBell onNavigate={jest.fn()} />);
    await flushMicrotasks();

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText(/couldn't load notifications/i)).toBeInTheDocument();
  });

  it('closes when clicking outside the panel', async () => {
    mockFetch({ bookingEntries: [bookingCreatedEntry] });

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <NotificationBell onNavigate={jest.fn()} />
      </div>,
    );
    await waitFor(() => expect(screen.getByLabelText(/notifications, 1 unread/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('New booking request')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('outside'));

    expect(screen.queryByText('New booking request')).not.toBeInTheDocument();
  });
});
