import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from './DashboardPage';

const fields = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true },
];

// "Today" and "currently in progress" computed relative to whenever the
// test actually runs - a hardcoded literal date would eventually drift
// into the past, same lesson as the booking-form and persistence work.
const now = new Date();
const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

const todaysBooking = {
  id: 'booking-1',
  fieldId: 'field-1',
  customerName: 'Alice',
  startTime: now.toISOString(),
  endTime: inOneHour.toISOString(),
  createdAt: twoHoursAgo.toISOString(),
  status: 'confirmed' as const,
};

const inProgressBooking = {
  id: 'booking-2',
  fieldId: 'field-2',
  customerName: 'Bob',
  startTime: oneHourAgo.toISOString(),
  endTime: inOneHour.toISOString(),
  createdAt: twoHoursAgo.toISOString(),
  status: 'confirmed' as const,
};

const pendingEscalation = {
  id: 'escalation-1',
  type: 'refund' as const,
  customerName: 'Sam',
  description: 'I want a refund',
  status: 'pending' as const,
  createdAt: twoHoursAgo.toISOString(),
  decidedAt: null,
  decidedBy: null,
  decisionNotes: null,
  customerNotifiedAt: null,
};

const approvedEscalation = {
  id: 'escalation-2',
  type: 'complaint' as const,
  customerName: 'Jordan',
  description: 'Field was in bad shape',
  status: 'approved' as const,
  createdAt: twoHoursAgo.toISOString(),
  decidedAt: oneHourAgo.toISOString(),
  decidedBy: 'Manager Mo',
  decisionNotes: null,
  customerNotifiedAt: oneHourAgo.toISOString(),
};

const openIssue = {
  id: 'issue-1',
  type: 'conflict' as const,
  fieldId: 'field-1',
  details: {},
  status: 'open' as const,
  detectedAt: twoHoursAgo.toISOString(),
  notifiedAt: twoHoursAgo.toISOString(),
  resolvedAt: null,
  resolvedBy: null,
  resolutionNotes: null,
};

const bookingCreatedEntry = {
  id: 'audit-1',
  entityType: 'booking' as const,
  entityId: 'booking-1',
  action: 'created',
  actor: 'Alice',
  timestamp: twoHoursAgo.toISOString(),
  details: { fieldId: 'field-1' },
};

const issueDetectedEntry = {
  id: 'audit-2',
  entityType: 'scheduling_issue' as const,
  entityId: 'issue-1',
  action: 'detected',
  actor: 'system',
  timestamp: oneHourAgo.toISOString(),
  details: { fieldId: 'field-1' },
};

const decisionEntry = {
  id: 'audit-3',
  entityType: 'customer_issue' as const,
  entityId: 'escalation-2',
  action: 'resolved',
  actor: 'Manager Mo',
  timestamp: oneHourAgo.toISOString(),
  details: { decision: 'approved', notes: null, customerNotified: true },
};

// Shares the same entityId/entityType/action as decisionEntry but has no
// `decision` field - this is the AI-instant-resolution shape, and must
// never be mistaken for a human approve/deny event.
const aiResolvedEntry = {
  id: 'audit-4',
  entityType: 'customer_issue' as const,
  entityId: 'issue-ai-1',
  action: 'resolved',
  actor: 'Taylor',
  timestamp: twoHoursAgo.toISOString(),
  details: { issue: 'Is Downtown Turf available?', resolution: 'Yes', escalationId: null },
};

function mockFetch(overrides: {
  fields?: unknown[];
  bookings?: unknown[];
  pendingEscalations?: unknown[];
  allEscalations?: unknown[];
  openIssues?: unknown[];
  bookingEntries?: unknown[];
  issueEntries?: unknown[];
  customerIssueEntries?: unknown[];
  fail?: boolean;
}) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL) => {
    const url = String(input);

    if (overrides.fail) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    }
    if (url.includes('/api/fields')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ fields: overrides.fields ?? [] }) } as Response);
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ bookings: overrides.bookings ?? [] }) } as Response);
    }
    if (url.includes('/api/escalations?status=pending')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ escalations: overrides.pendingEscalations ?? [] }),
      } as Response);
    }
    if (url.includes('/api/escalations')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ escalations: overrides.allEscalations ?? [] }),
      } as Response);
    }
    if (url.includes('/api/scheduling-issues')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ issues: overrides.openIssues ?? [] }) } as Response);
    }
    if (url.includes('entityType=booking')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ entries: overrides.bookingEntries ?? [] }) } as Response);
    }
    if (url.includes('entityType=scheduling_issue')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ entries: overrides.issueEntries ?? [] }) } as Response);
    }
    if (url.includes('entityType=customer_issue')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ entries: overrides.customerIssueEntries ?? [] }),
      } as Response);
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch);
}

describe('DashboardPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows summary counts from real data across fields, bookings, approvals, and issues', async () => {
    mockFetch({
      fields,
      bookings: [todaysBooking],
      pendingEscalations: [pendingEscalation],
      openIssues: [openIssue],
    });

    render(<DashboardPage onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Available Fields')).toBeInTheDocument();
    });

    const fieldsCard = screen.getByText('Available Fields').closest('.gk-summary-card');
    expect(fieldsCard).toHaveTextContent('2');

    const bookingsCard = screen.getByText("Today's Bookings").closest('.gk-summary-card');
    expect(bookingsCard).toHaveTextContent('1');

    const approvalsCard = screen.getByText('Pending Approvals').closest('.gk-summary-card');
    expect(approvalsCard).toHaveTextContent('1');

    const issuesCard = screen.getByText('Scheduling Issues').closest('.gk-summary-card');
    expect(issuesCard).toHaveTextContent('1');
  });

  it("lists today's bookings with customer, field, time, and status", async () => {
    mockFetch({ fields, bookings: [todaysBooking] });

    render(<DashboardPage onNavigate={jest.fn()} />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Alice')).toBeInTheDocument();
    expect(within(table).getByText('Riverside Pitch')).toBeInTheDocument();
    expect(within(table).getByText('confirmed')).toBeInTheDocument();
  });

  it('marks a field as Booked when a confirmed booking currently covers this moment, and Available otherwise', async () => {
    mockFetch({ fields, bookings: [inProgressBooking] });

    render(<DashboardPage onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(document.querySelector('.gk-field-status-list')).not.toBeNull();
    });
    const scoped = within(document.querySelector('.gk-field-status-list') as HTMLElement);

    const bookedRow = scoped.getByText('Downtown Turf').closest('.gk-field-status-row');
    expect(bookedRow).toHaveTextContent('Booked');

    const availableRow = scoped.getByText('Riverside Pitch').closest('.gk-field-status-row');
    expect(availableRow).toHaveTextContent('Available');
  });

  it('builds a merged, most-recent-first activity feed without duplicating the human-decision entry as a second event', async () => {
    mockFetch({
      fields,
      bookingEntries: [bookingCreatedEntry],
      issueEntries: [issueDetectedEntry],
      customerIssueEntries: [decisionEntry, aiResolvedEntry],
      allEscalations: [approvedEscalation],
    });

    render(<DashboardPage onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/new booking/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/scheduling issue detected/i)).toBeInTheDocument();
    expect(screen.getByText(/request approved.*jordan/i)).toBeInTheDocument();
    // The AI-instant-resolution entry (no `decision` field) must not be
    // rendered as an approve/deny activity event.
    expect(screen.queryByText(/taylor/i)).not.toBeInTheDocument();
  });

  it('shows empty states when there is nothing to report', async () => {
    mockFetch({ fields: [] });

    render(<DashboardPage onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/no bookings scheduled for today/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no fields to show right now/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing has happened yet/i)).toBeInTheDocument();
  });

  it('shows an error state if any of the dashboard data fails to load', async () => {
    mockFetch({ fail: true });

    render(<DashboardPage onNavigate={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('quick actions navigate to the right existing pages', async () => {
    mockFetch({ fields });
    const onNavigate = jest.fn();

    render(<DashboardPage onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Quick actions')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /book a field/i }));
    expect(onNavigate).toHaveBeenCalledWith('booking');

    await userEvent.click(screen.getByRole('button', { name: /view bookings/i }));
    expect(onNavigate).toHaveBeenCalledWith('bookings');

    await userEvent.click(screen.getByRole('button', { name: /manage fields/i }));
    expect(onNavigate).toHaveBeenCalledWith('booking');
  });
});
