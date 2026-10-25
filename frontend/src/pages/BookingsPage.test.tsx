import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingsPage, BOOKINGS_POLL_INTERVAL_MS } from './BookingsPage';

const sampleFields = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true },
];

const sampleBooking = {
  id: 'booking-1',
  fieldId: 'field-1',
  customerName: 'Alice',
  startTime: '2026-09-05T10:00:00.000Z',
  endTime: '2026-09-05T11:00:00.000Z',
  createdAt: '2026-09-05T09:00:00.000Z',
  status: 'confirmed' as const,
};

function mockFetchSequence(responses: Array<{ body: unknown; status?: number }>) {
  const spy = jest.spyOn(global, 'fetch');
  for (const { body, status = 200 } of responses) {
    spy.mockResolvedValueOnce({
      ok: status < 400,
      status,
      json: () => Promise.resolve(body),
    } as Response);
  }
  return spy;
}

// With fake timers active, `waitFor`'s own internal polling (which itself
// uses setTimeout) never gets a turn to run. The interval this page sets
// up is also registered against whichever timer implementation was active
// at mount time, so fake timers have to be enabled *before* rendering for
// `advanceTimersByTime` to reach it at all. Given both constraints, these
// interval tests render under fake timers from the start and manually pump
// the microtask queue instead of using `waitFor`.
async function flushMicrotasks(times = 8) {
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('BookingsPage', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows bookings joined with the field they belong to', async () => {
    mockFetchSequence([{ body: { bookings: [sampleBooking] } }, { body: { fields: sampleFields } }]);

    render(<BookingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/riverside pitch — north park/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('shows an empty state when there are no bookings yet', async () => {
    mockFetchSequence([{ body: { bookings: [] } }, { body: { fields: sampleFields } }]);

    render(<BookingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no bookings have been made yet/i)).toBeInTheDocument();
    });
  });

  it('shows an error state if loading fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);

    render(<BookingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('refetches when Refresh is clicked, picking up a newly made booking', async () => {
    mockFetchSequence([{ body: { bookings: [] } }, { body: { fields: sampleFields } }]);

    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no bookings have been made yet/i)).toBeInTheDocument();
    });

    mockFetchSequence([{ body: { bookings: [sampleBooking] } }, { body: { fields: sampleFields } }]);
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('auto-refreshes on an interval and picks up a booking made elsewhere without a click', async () => {
    jest.useFakeTimers();
    mockFetchSequence([{ body: { bookings: [] } }, { body: { fields: sampleFields } }]);

    render(<BookingsPage />);
    await flushMicrotasks();
    expect(screen.getByText(/no bookings have been made yet/i)).toBeInTheDocument();

    mockFetchSequence([{ body: { bookings: [sampleBooking] } }, { body: { fields: sampleFields } }]);
    act(() => {
      jest.advanceTimersByTime(BOOKINGS_POLL_INTERVAL_MS);
    });
    await flushMicrotasks();

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(4); // 2 initial + 2 polled
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('a failed background refresh does not replace the list that is already on screen', async () => {
    jest.useFakeTimers();
    mockFetchSequence([{ body: { bookings: [sampleBooking] } }, { body: { fields: sampleFields } }]);

    render(<BookingsPage />);
    await flushMicrotasks();
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Both concurrent calls the poll makes (bookings + fields) are mocked
    // explicitly here - a real network outage would fail both, and leaving
    // either one unmocked would fall through to the real global fetch.
    const spy = jest.spyOn(global, 'fetch');
    spy.mockRejectedValueOnce(new Error('network down'));
    spy.mockRejectedValueOnce(new Error('network down'));
    act(() => {
      jest.advanceTimersByTime(BOOKINGS_POLL_INTERVAL_MS);
    });
    await flushMicrotasks();

    // The poll genuinely fired and failed (proven by the call count, not
    // assumed), yet the last-known-good list is still on screen rather
    // than being replaced by an error page.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(4); // 2 initial + 2 failed poll attempts
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
