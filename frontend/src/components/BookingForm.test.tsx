import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from './BookingForm';

const noop = () => {};

// Computed relative to whenever the test actually runs, never a hardcoded
// literal date — a fixed date would eventually drift into the past and
// make every slot in the grid show as "Past" (unselectable), which has
// nothing to do with what these tests are actually checking.
function futureDateString(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Builds the same local-time-to-UTC-ISO conversion the component itself
// uses, so a test booking constructed here genuinely overlaps the local
// hour slot it's meant to, regardless of the machine's timezone.
function isoForLocalHour(dateStr: string, hour: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

function setupFetchMock(options: {
  bookings?: unknown[];
  bookingsFail?: boolean;
  createResponse?: { body: unknown; status: number };
  suggestionsResponse?: { body: unknown; status?: number } | 'fail';
}) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/api/bookings') && method === 'GET') {
      if (options.bookingsFail) {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ bookings: options.bookings ?? [] }),
      } as Response);
    }

    if (url.includes('/api/bookings') && method === 'POST') {
      const { body, status } = options.createResponse ?? { body: {}, status: 500 };
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
    }

    if (url.includes('/api/scheduling/suggestions')) {
      if (options.suggestionsResponse === 'fail') {
        return Promise.reject(new Error('network down'));
      }
      const { body, status = 200 } = options.suggestionsResponse ?? { body: { slots: [], rationale: '' } };
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  }) as typeof fetch);
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText(/your name/i), 'Alice');
  fireEvent.change(screen.getByLabelText(/date/i), { target: { value: futureDateString(7) } });
  await userEvent.click(await screen.findByRole('button', { name: /4:00 pm/i }));
  await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
}

const renderForm = () =>
  render(
    <BookingForm
      fieldId="field-1"
      fieldName="Riverside Pitch"
      fieldLocation="North Park"
      fieldSurfaceType="grass"
      fieldPricePerHour={40}
      onClose={noop}
    />,
  );

describe('BookingForm', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('books the field on confirm and shows a confirmation message', async () => {
    setupFetchMock({
      bookings: [],
      createResponse: {
        status: 201,
        body: {
          booking: {
            id: 'booking-1',
            fieldId: 'field-1',
            customerName: 'Alice',
            startTime: '2026-09-05T10:00:00.000Z',
            endTime: '2026-09-05T11:00:00.000Z',
            createdAt: '2026-09-05T09:00:00.000Z',
          },
        },
      },
    });

    renderForm();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/booked riverside pitch for alice/i);
    });

    const postCall = (global.fetch as jest.Mock).mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(postCall[1].body)).toMatchObject({ fieldId: 'field-1', customerName: 'Alice' });
  });

  it('marks an hour as Booked and disabled when an existing confirmed booking already covers it, and leaves others Available', async () => {
    const date = futureDateString(7);
    setupFetchMock({
      bookings: [
        {
          id: 'booking-existing',
          fieldId: 'field-1',
          customerName: 'Bob',
          startTime: isoForLocalHour(date, 16),
          endTime: isoForLocalHour(date, 17),
          createdAt: '2026-01-01T00:00:00.000Z',
          status: 'confirmed',
        },
      ],
    });

    renderForm();
    fireEvent.change(await screen.findByLabelText(/date/i), { target: { value: date } });

    const bookedButton = await screen.findByRole('button', { name: /4:00 pm.*booked/i });
    expect(bookedButton).toBeDisabled();

    const availableButton = screen.getByRole('button', { name: /5:00 pm.*available/i });
    expect(availableButton).not.toBeDisabled();
  });

  it('does not block booking if the availability preview itself fails to load', async () => {
    setupFetchMock({ bookingsFail: true });

    renderForm();

    const slotButton = await screen.findByRole('button', { name: /4:00 pm.*available/i });
    expect(slotButton).not.toBeDisabled();
    await waitFor(() => {
      expect(screen.getByText(/couldn't check which times are already booked/i)).toBeInTheDocument();
    });
  });

  it('shows the conflict message, and suggested alternative times, when the field is already booked', async () => {
    setupFetchMock({
      bookings: [],
      createResponse: { status: 409, body: { error: 'Field field-1 is already booked for an overlapping time.' } },
      suggestionsResponse: {
        body: {
          slots: [{ startTime: '2026-09-05T17:00:00.000Z', endTime: '2026-09-05T18:00:00.000Z' }],
          rationale: 'The requested time is already booked, so these are the nearest available windows of the same duration.',
        },
      },
    });

    renderForm();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already booked/i);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // STORY-006: a suggested alternative time should also appear, backed
    // by the second (scheduling) fetch call, not silently dropped.
    await waitFor(() => {
      expect(screen.getByText(/nearest available windows/i)).toBeInTheDocument();
    });

    const schedulingCall = (global.fetch as jest.Mock).mock.calls.find(([url]) =>
      String(url).includes('/api/scheduling/suggestions'),
    );
    expect(JSON.parse(schedulingCall[1].body)).toMatchObject({ fieldId: 'field-1' });
  });

  it('selecting a suggested slot updates the booking summary', async () => {
    const date = futureDateString(7);
    // Built the same timezone-safe way as the "Booked" test - a hardcoded
    // UTC string here would only produce "5:00 PM" by coincidence on a
    // UTC+0 machine.
    const suggestedStart = isoForLocalHour(date, 17);
    const suggestedEnd = isoForLocalHour(date, 18);
    setupFetchMock({
      bookings: [],
      createResponse: { status: 409, body: { error: 'Field field-1 is already booked for an overlapping time.' } },
      suggestionsResponse: {
        body: {
          slots: [{ startTime: suggestedStart, endTime: suggestedEnd }],
          rationale: 'The requested time is already booked, so these are the nearest available windows of the same duration.',
        },
      },
    });

    renderForm();
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/nearest available windows/i)).toBeInTheDocument());

    const suggestionButton = screen.getByRole('button', { name: new RegExp(new Date(suggestedStart).getFullYear().toString()) });
    await userEvent.click(suggestionButton);

    await waitFor(() => {
      expect(screen.getByText('5:00 PM – 6:00 PM')).toBeInTheDocument();
    });
  });

  it('does not crash and simply omits suggestions if the scheduling call itself fails', async () => {
    setupFetchMock({
      bookings: [],
      createResponse: { status: 409, body: { error: 'Field field-1 is already booked for an overlapping time.' } },
      suggestionsResponse: 'fail',
    });

    renderForm();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already booked/i);
    });
    // The conflict message is still there; there's just nothing more to
    // show below it, rather than a crash.
    expect(screen.queryByText(/nearest available windows/i)).not.toBeInTheDocument();
  });

  it('shows only the top-level error message for an invalid (400) response, never the Zod details', async () => {
    setupFetchMock({
      bookings: [],
      createResponse: {
        status: 400,
        body: {
          error: 'Invalid booking request.',
          details: [
            { path: ['customerName'], message: 'Required', code: 'invalid_type', received: 'SENTINEL_TOKEN_12345' },
          ],
        },
      },
    });

    renderForm();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid booking request.');
    });
    expect(screen.queryByText(/SENTINEL_TOKEN_12345/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nearest available windows/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the frontend hardcoded message for an unmapped (500) error, never the backend error text', async () => {
    setupFetchMock({
      bookings: [],
      createResponse: { status: 500, body: { error: 'BookingCreateError: connection to bookings-db refused' } },
    });

    renderForm();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unable to create the booking right now. Please try again shortly.',
      );
    });
    expect(screen.queryByText(/bookings-db/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nearest available windows/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
