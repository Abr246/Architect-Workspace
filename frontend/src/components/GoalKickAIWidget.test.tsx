import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalKickAIWidget } from './GoalKickAIWidget';

async function flushMicrotasks(times = 8) {
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await Promise.resolve();
    });
  }
}

const fields = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true, sizeFormat: '11v11', description: '', amenities: [] },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true, sizeFormat: '7v7', description: '', amenities: [] },
];

// A fixed "+2 hours" offset can cross midnight depending on exactly when the
// suite runs, which would make a "later today" fixture look like tomorrow to
// the component's own isToday() check - clamp to the same local calendar day.
function laterTodayIso(): string {
  const now = new Date();
  const rolledOverToTomorrow = new Date(now.getTime() + 2 * 60 * 60 * 1000).getDate() !== now.getDate();
  // setHours() only changes the time-of-day, not the calendar date, so the
  // clamped candidate must start from "now" itself (today's date), not from
  // the already-rolled-over +2h value.
  const candidate = rolledOverToTomorrow ? new Date(now) : new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (rolledOverToTomorrow) {
    candidate.setHours(23, 30, 0, 0);
  }
  return candidate.toISOString();
}

const upcomingStart = laterTodayIso();

const upcomingBooking = {
  id: 'booking-1',
  fieldId: 'field-1',
  customerName: 'John Smith',
  startTime: upcomingStart,
  endTime: new Date(new Date(upcomingStart).getTime() + 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  status: 'confirmed',
};

function mockFetch(overrides: {
  fields?: unknown[];
  bookings?: unknown[];
  issues?: unknown[];
  fail?: boolean;
  askResponse?: { body: unknown; status?: number };
}) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (overrides.fail) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    }
    if (url.includes('/api/assistant/ask') && method === 'POST') {
      const { body, status = 200 } = overrides.askResponse ?? {
        body: { answer: "Here's our current pricing: Riverside Pitch: $40/hr.", understood: true },
      };
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
    }
    if (url.includes('/api/scheduling-issues')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ issues: overrides.issues ?? [] }) } as Response);
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ bookings: overrides.bookings ?? [] }) } as Response);
    }
    if (url.includes('/api/fields')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ fields: overrides.fields ?? fields }) } as Response);
    }
    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  }) as typeof fetch);
}

async function openWidget() {
  await userEvent.click(screen.getByRole('button', { name: /open goalkick ai/i }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'What fields are available today?' })).not.toBeDisabled();
  });
}

describe('GoalKickAIWidget', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts closed, showing only the floating toggle button', async () => {
    mockFetch({});
    render(<GoalKickAIWidget />);
    await flushMicrotasks();

    expect(screen.getByRole('button', { name: /open goalkick ai/i })).toBeInTheDocument();
    expect(screen.queryByText('GoalKick AI')).not.toBeInTheDocument();
  });

  it('clicking the toggle opens the panel with the header, description, greeting, and all 6 suggestions', async () => {
    mockFetch({});
    render(<GoalKickAIWidget />);
    await openWidget();

    expect(screen.getByText('GoalKick AI')).toBeInTheDocument();
    expect(screen.getByText('Your soccer facility assistant')).toBeInTheDocument();
    expect(screen.getByText(/ask me about bookings, fields, schedules/i)).toBeInTheDocument();
    expect(screen.getByText(/hi, i'm goalkick ai/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How many bookings do we have today?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Are there any scheduling conflicts?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Which field is booked the most?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'What are the busiest booking times?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Show me today's upcoming bookings." })).toBeInTheDocument();
  });

  it('clicking the close button hides the panel again', async () => {
    mockFetch({});
    render(<GoalKickAIWidget />);
    await openWidget();

    await userEvent.click(screen.getByRole('button', { name: /close goalkick ai panel/i }));
    expect(screen.queryByText('Your soccer facility assistant')).not.toBeInTheDocument();
  });

  it('clicking outside the open panel closes it, like the notification bell', async () => {
    mockFetch({});
    render(
      <div>
        <button type="button">Elsewhere</button>
        <GoalKickAIWidget />
      </div>,
    );
    await openWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByText('Your soccer facility assistant')).not.toBeInTheDocument();
  });

  it('clicking a suggested question puts it in the chat and answers it from real local data, with no network call', async () => {
    mockFetch({ issues: [] });
    render(<GoalKickAIWidget />);
    await openWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Are there any scheduling conflicts?' }));

    const messagesPane = document.querySelector('.gk-chat__messages') as HTMLElement;
    expect(within(messagesPane).getByText('Are there any scheduling conflicts?')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/everything looks clear/i)).toBeInTheDocument();
    });

    const askCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('/api/assistant/ask'));
    expect(askCalls).toHaveLength(0);
  });

  it('answers "upcoming bookings" using real booking data', async () => {
    mockFetch({ bookings: [upcomingBooking] });
    render(<GoalKickAIWidget />);
    await openWidget();

    await userEvent.click(screen.getByRole('button', { name: "Show me today's upcoming bookings." }));

    await waitFor(() => {
      expect(screen.getByText(/riverside pitch/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/john smith/i)).toBeInTheDocument();
  });

  it('falls back to the existing backend assistant for a question outside the local intents (e.g. pricing)', async () => {
    mockFetch({ askResponse: { body: { answer: "Here's our current pricing: Riverside Pitch: $40/hr.", understood: true } } });
    render(<GoalKickAIWidget />);
    await openWidget();

    await userEvent.type(screen.getByLabelText(/ask goalkick ai/i), 'How much does it cost?');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getByText(/riverside pitch: \$40\/hr/i)).toBeInTheDocument();
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/api/assistant/ask'));
    expect(JSON.parse(init.body)).toMatchObject({ question: 'How much does it cost?' });
  });

  it('shows the typing indicator while waiting for a response, then removes it', async () => {
    mockFetch({ issues: [] });
    render(<GoalKickAIWidget />);
    await openWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Are there any scheduling conflicts?' }));
    expect(screen.getByLabelText(/goalkick ai is typing/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByLabelText(/goalkick ai is typing/i)).not.toBeInTheDocument();
    });
  });

  it('keeps a running log of multiple exchanges, each with a timestamp', async () => {
    mockFetch({ issues: [] });
    render(<GoalKickAIWidget />);
    await openWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Are there any scheduling conflicts?' }));
    await waitFor(() => expect(screen.getByText(/everything looks clear/i)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'How many bookings do we have today?' }));
    await waitFor(() => expect(screen.getByText(/no bookings scheduled for today/i)).toBeInTheDocument());

    // Both exchanges are still visible - nothing got replaced.
    const messagesPane = document.querySelector('.gk-chat__messages') as HTMLElement;
    expect(within(messagesPane).getByText('Are there any scheduling conflicts?')).toBeInTheDocument();
    expect(screen.getByText(/everything looks clear/i)).toBeInTheDocument();
  });

  it('shows an error message if the backend fallback request fails, without crashing', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/assistant/ask')) return Promise.reject(new Error('network down'));
      if (url.includes('/api/scheduling-issues')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ issues: [] }) } as Response);
      if (url.includes('/api/bookings')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ bookings: [] }) } as Response);
      if (url.includes('/api/fields')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ fields }) } as Response);
      throw new Error(`Unexpected fetch call: ${url}`);
    }) as typeof fetch);

    render(<GoalKickAIWidget />);
    await openWidget();
    await userEvent.type(screen.getByLabelText(/ask goalkick ai/i), 'How much does it cost?');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
