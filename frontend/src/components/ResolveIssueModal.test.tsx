import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResolveIssueModal } from './ResolveIssueModal';

const fields = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true, sizeFormat: '11v11', description: '', amenities: [] },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true, sizeFormat: '7v7', description: '', amenities: [] },
];

function futureDateString(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const originalDate = futureDateString(7);

const conflictingBooking = {
  id: 'booking-1',
  fieldId: 'field-1',
  customerName: 'John Smith',
  startTime: `${originalDate}T19:00:00.000Z`,
  endTime: `${originalDate}T20:00:00.000Z`,
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'confirmed' as const,
};

const issue = {
  id: 'issue-1',
  type: 'conflict' as const,
  fieldId: 'field-1',
  details: {
    requestedBy: 'Mike Johnson',
    requestedStartTime: `${originalDate}T19:00:00.000Z`,
    requestedEndTime: `${originalDate}T20:00:00.000Z`,
    conflictingBookingId: 'booking-1',
  },
  status: 'open' as const,
  detectedAt: '2026-01-01T10:00:00.000Z',
  notifiedAt: '2026-01-01T10:00:00.000Z',
  resolvedAt: null,
  resolvedBy: null,
  resolutionNotes: null,
};

function mockFetch(responses: {
  cancel?: { body: unknown; status?: number };
  create?: { body: unknown; status?: number };
  resolve?: { body: unknown; status?: number };
}) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/cancel')) {
      const { body, status = 200 } = responses.cancel ?? { body: { booking: { ...conflictingBooking, status: 'cancelled' } } };
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
    }
    if (url.includes('/resolve')) {
      const { body, status = 200 } = responses.resolve ?? { body: { issue: { ...issue, status: 'resolved' } } };
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
    }
    if (url.includes('/api/bookings') && method === 'POST') {
      const { body, status = 201 } = responses.create ?? { body: { booking: { id: 'booking-2' } }, status: 201 };
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
    }
    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  }) as typeof fetch);
}

const renderModal = (overrides: Partial<Parameters<typeof ResolveIssueModal>[0]> = {}) =>
  render(
    <ResolveIssueModal
      issue={issue}
      conflictingBooking={conflictingBooking}
      allBookings={[conflictingBooking]}
      fields={fields}
      onClose={jest.fn()}
      onResolved={jest.fn()}
      {...overrides}
    />,
  );

describe('ResolveIssueModal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('cancelling the booking calls cancel then resolve, and reports success', async () => {
    mockFetch({});
    const onResolved = jest.fn();

    renderModal({ onResolved });
    await userEvent.click(screen.getByRole('button', { name: /^cancel booking$/i }));
    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(onResolved).toHaveBeenCalled());

    const cancelCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/cancel'));
    expect(JSON.parse(cancelCall[1].body)).toEqual({ customerName: 'Manager Mo' });
  });

  it('rescheduling cancels the old booking and creates a new one on the same field at the chosen time', async () => {
    mockFetch({});
    const onResolved = jest.fn();
    const newDate = futureDateString(10);

    renderModal({ onResolved });
    await userEvent.click(screen.getByRole('button', { name: /change booking time/i }));
    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');

    const dateInput = screen.getByLabelText(/^date$/i);
    fireEvent.change(dateInput, { target: { value: newDate } });

    await userEvent.click(await screen.findByRole('button', { name: /4:00 pm.*available/i }));
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(onResolved).toHaveBeenCalled());

    const createCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, init]) => String(url).includes('/api/bookings') && init?.method === 'POST' && !String(url).includes('cancel'),
    );
    const createBody = JSON.parse(createCall[1].body);
    expect(createBody.fieldId).toBe('field-1');
    expect(createBody.customerName).toBe('John Smith');
    expect(createBody.startTime).toBe(new Date(`${newDate}T16:00:00`).toISOString());
  });

  it('moving to another field cancels the old booking and creates a new one on the chosen field', async () => {
    mockFetch({});
    const onResolved = jest.fn();
    const newDate = futureDateString(10);

    renderModal({ onResolved });
    await userEvent.click(screen.getByRole('button', { name: /move to another field/i }));
    await userEvent.selectOptions(screen.getByLabelText(/new field/i), 'field-2');
    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');

    const dateInput = screen.getByLabelText(/^date$/i);
    fireEvent.change(dateInput, { target: { value: newDate } });

    await userEvent.click(await screen.findByRole('button', { name: /4:00 pm.*available/i }));
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(onResolved).toHaveBeenCalled());

    const createCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, init]) => String(url).includes('/api/bookings') && init?.method === 'POST' && !String(url).includes('cancel'),
    );
    expect(JSON.parse(createCall[1].body).fieldId).toBe('field-2');
  });

  it("the field dropdown never offers the booking's own current field as a destination", async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: /move to another field/i }));
    const options = within(screen.getByLabelText(/new field/i)).getAllByRole('option');
    expect(options.map((o) => o.textContent)).not.toContain('Riverside Pitch');
    expect(options.map((o) => o.textContent)).toContain('Downtown Turf');
  });

  it('if cancelling the booking fails, it stops there and does not attempt to create a new one or resolve the issue', async () => {
    mockFetch({ cancel: { body: { error: 'This booking no longer exists.' }, status: 404 } });
    const onResolved = jest.fn();

    renderModal({ onResolved });
    await userEvent.click(screen.getByRole('button', { name: /^cancel booking$/i }));
    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no longer exists/i);
    });
    expect(onResolved).not.toHaveBeenCalled();
    const resolveCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/resolve'));
    expect(resolveCall).toBeUndefined();
  });

  it('if the booking is cancelled but rebooking at the new time fails, it reports the partial failure honestly instead of silently resolving', async () => {
    mockFetch({ create: { body: { error: 'Field field-1 is already booked for an overlapping time.' }, status: 409 } });
    const onResolved = jest.fn();
    const newDate = futureDateString(10);

    renderModal({ onResolved });
    await userEvent.click(screen.getByRole('button', { name: /change booking time/i }));
    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');
    const dateInput = screen.getByLabelText(/^date$/i);
    fireEvent.change(dateInput, { target: { value: newDate } });
    await userEvent.click(await screen.findByRole('button', { name: /4:00 pm.*available/i }));
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/cancelled, but rebooking.*failed/i);
    });
    expect(onResolved).not.toHaveBeenCalled();
    const resolveCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/resolve'));
    expect(resolveCall).toBeUndefined();
  });

  it('marking as resolved without touching any booking still works exactly as before', async () => {
    mockFetch({});
    const onResolved = jest.fn();

    renderModal({ onResolved });
    // "Mark as resolved" is the default selected action.
    await userEvent.type(screen.getByLabelText(/resolved by/i), 'Manager Mo');
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(onResolved).toHaveBeenCalled());
    const cancelCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/cancel'));
    expect(cancelCall).toBeUndefined();
  });

  it('disables the mutating actions and explains why when the original booking cannot be found', () => {
    renderModal({ conflictingBooking: null });

    expect(screen.getByRole('button', { name: /^cancel booking$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /change booking time/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move to another field/i })).toBeDisabled();
    expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
  });
});
