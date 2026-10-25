import { act, render, screen, waitFor } from '@testing-library/react';
import { CustomerInteractionsPage, INTERACTIONS_POLL_INTERVAL_MS } from './CustomerInteractionsPage';

const aiInteractionEntry = {
  id: 'audit-1',
  entityType: 'ai_interaction' as const,
  entityId: 'interaction-1',
  action: 'answered',
  actor: 'Mia',
  timestamp: '2026-09-05T09:00:00.000Z',
  details: { question: 'How much is Riverside Pitch?', answer: 'Riverside Pitch: $40/hr.', understood: true },
};

const aiResolvedHelpEntry = {
  id: 'audit-2',
  entityType: 'customer_issue' as const,
  entityId: 'issue-1',
  action: 'resolved',
  actor: 'Jordan',
  timestamp: '2026-09-05T09:05:00.000Z',
  details: { issue: 'Is Downtown Turf available?', resolution: 'Currently available: Downtown Turf.', escalationId: null },
};

const escalatedHelpEntry = {
  id: 'audit-3',
  entityType: 'customer_issue' as const,
  entityId: 'escalation-1',
  action: 'escalated',
  actor: 'Sam',
  timestamp: '2026-09-05T09:10:00.000Z',
  details: {
    issue: 'I want a refund for my booking',
    resolution: "Thanks — I've passed this to our team, and you'll be notified once it's reviewed.",
    escalationId: 'escalation-1',
  },
};

// A human-decision entry sharing the escalated entry's entityId, with a
// completely different details shape and no `issue` field - this must NOT
// show up as a second help-request row.
const decisionEntry = {
  id: 'audit-4',
  entityType: 'customer_issue' as const,
  entityId: 'escalation-1',
  action: 'resolved',
  actor: 'Manager Mo',
  timestamp: '2026-09-05T09:20:00.000Z',
  details: { decision: 'approved', notes: null, customerNotified: true },
};

const pendingEscalation = {
  id: 'escalation-1',
  type: 'refund' as const,
  customerName: 'Sam',
  description: 'I want a refund for my booking',
  status: 'pending' as const,
  createdAt: '2026-09-05T09:10:00.000Z',
  decidedAt: null,
  decidedBy: null,
  decisionNotes: null,
  customerNotifiedAt: null,
};

function mockFetchImplementation(overrides: {
  aiEntries?: unknown[];
  issueEntries?: unknown[];
  escalations?: unknown[];
  fail?: boolean;
}) {
  return jest.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (overrides.fail) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    }
    if (url.includes('entityType=ai_interaction')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ entries: overrides.aiEntries ?? [] }) } as Response);
    }
    if (url.includes('entityType=customer_issue')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ entries: overrides.issueEntries ?? [] }) } as Response);
    }
    if (url.includes('/api/escalations')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ escalations: overrides.escalations ?? [] }) } as Response);
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });
}

async function flushMicrotasks(times = 8) {
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('CustomerInteractionsPage', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows questions asked via the assistant', async () => {
    mockFetchImplementation({ aiEntries: [aiInteractionEntry] });

    render(<CustomerInteractionsPage />);

    await waitFor(() => {
      expect(screen.getByText('How much is Riverside Pitch?')).toBeInTheDocument();
    });
    expect(screen.getByText('Riverside Pitch: $40/hr.')).toBeInTheDocument();
    expect(screen.getByText('Mia')).toBeInTheDocument();
  });

  it('shows a help request the AI resolved directly, without an escalation status', async () => {
    mockFetchImplementation({ issueEntries: [aiResolvedHelpEntry] });

    render(<CustomerInteractionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Is Downtown Turf available?')).toBeInTheDocument();
    });
    expect(screen.getByText('Resolved by AI')).toBeInTheDocument();
  });

  it('shows an escalated help request joined with its current escalation status, without a duplicate row for the decision entry', async () => {
    mockFetchImplementation({
      issueEntries: [escalatedHelpEntry, decisionEntry],
      escalations: [pendingEscalation],
    });

    render(<CustomerInteractionsPage />);

    await waitFor(() => {
      expect(screen.getByText('I want a refund for my booking')).toBeInTheDocument();
    });
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    // The decision entry (no `issue` field) must not produce a second row.
    expect(screen.getAllByText('I want a refund for my booking')).toHaveLength(1);
  });

  it('reflects an approved escalation once decided', async () => {
    mockFetchImplementation({
      issueEntries: [escalatedHelpEntry],
      escalations: [{ ...pendingEscalation, status: 'approved' as const }],
    });

    render(<CustomerInteractionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  it('shows empty states when nothing has happened yet', async () => {
    mockFetchImplementation({});

    render(<CustomerInteractionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no questions have been asked yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no help requests have been submitted yet/i)).toBeInTheDocument();
  });

  it('shows an error state if loading fails', async () => {
    mockFetchImplementation({ fail: true });

    render(<CustomerInteractionsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('auto-refreshes and picks up a new question without a click', async () => {
    jest.useFakeTimers();
    mockFetchImplementation({});

    render(<CustomerInteractionsPage />);
    await flushMicrotasks();
    expect(screen.getByText(/no questions have been asked yet/i)).toBeInTheDocument();

    mockFetchImplementation({ aiEntries: [aiInteractionEntry] });
    act(() => {
      jest.advanceTimersByTime(INTERACTIONS_POLL_INTERVAL_MS);
    });
    await flushMicrotasks();

    expect(screen.getByText('How much is Riverside Pitch?')).toBeInTheDocument();
  });
});
