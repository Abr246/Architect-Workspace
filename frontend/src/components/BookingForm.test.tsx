import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from './BookingForm';

function mockFetchOnce(body: unknown, status: number) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText(/name/i), 'Alice');
  // userEvent.type doesn't reliably handle datetime-local inputs; RTL's own
  // fireEvent.change (which wraps in act() for us) is the standard way to
  // set this input type in tests.
  const [startInput, endInput] = screen.getAllByLabelText(/start|end/i);
  fireEvent.change(startInput, { target: { value: '2026-09-05T10:00' } });
  fireEvent.change(endInput, { target: { value: '2026-09-05T11:00' } });
  await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
}

describe('BookingForm', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('books the field on confirm and shows a confirmation message', async () => {
    mockFetchOnce(
      {
        booking: {
          id: 'booking-1',
          fieldId: 'field-1',
          customerName: 'Alice',
          startTime: '2026-09-05T10:00:00.000Z',
          endTime: '2026-09-05T11:00:00.000Z',
          createdAt: '2026-09-05T09:00:00.000Z',
        },
      },
      201,
    );

    render(<BookingForm fieldId="field-1" fieldName="Riverside Pitch" />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/booked riverside pitch for alice/i);
    });

    const [, body] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(body.body)).toMatchObject({ fieldId: 'field-1', customerName: 'Alice' });
  });

  it('shows the conflict message, and suggested alternative times, when the field is already booked', async () => {
    mockFetchOnce({ error: 'Field field-1 is already booked for an overlapping time.' }, 409);
    mockFetchOnce(
      {
        slots: [{ startTime: '2026-09-05T11:00:00.000Z', endTime: '2026-09-05T12:00:00.000Z' }],
        rationale: 'The requested time is already booked, so these are the nearest available windows of the same duration.',
      },
      200,
    );

    render(<BookingForm fieldId="field-1" fieldName="Riverside Pitch" />);
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
    expect(screen.getByRole('button', { name: /2026/ })).toBeInTheDocument();

    const [, schedulingCallBody] = (global.fetch as jest.Mock).mock.calls[1];
    expect(JSON.parse(schedulingCallBody.body)).toMatchObject({ fieldId: 'field-1' });
  });

  it('does not crash and simply omits suggestions if the scheduling call itself fails', async () => {
    mockFetchOnce({ error: 'Field field-1 is already booked for an overlapping time.' }, 409);
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));

    render(<BookingForm fieldId="field-1" fieldName="Riverside Pitch" />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already booked/i);
    });
    // The conflict message is still there; there's just nothing more to
    // show below it, rather than a crash.
    expect(screen.queryByText(/nearest available windows/i)).not.toBeInTheDocument();
  });

  it('shows the same confirmation message for an idempotent (200) response as for a fresh (201) booking', async () => {
    mockFetchOnce(
      {
        booking: {
          id: 'booking-1',
          fieldId: 'field-1',
          customerName: 'Alice',
          startTime: '2026-09-05T10:00:00.000Z',
          endTime: '2026-09-05T11:00:00.000Z',
          createdAt: '2026-09-05T09:00:00.000Z',
        },
      },
      200,
    );

    render(<BookingForm fieldId="field-1" fieldName="Riverside Pitch" />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/booked riverside pitch for alice/i);
    });

    const [, body] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(body.body)).toMatchObject({ fieldId: 'field-1', customerName: 'Alice' });
  });

  it('shows only the top-level error message for an invalid (400) response, never the Zod details', async () => {
    mockFetchOnce(
      {
        error: 'Invalid booking request.',
        details: [
          { path: ['customerName'], message: 'Required', code: 'invalid_type', received: 'SENTINEL_TOKEN_12345' },
        ],
      },
      400,
    );

    render(<BookingForm fieldId="field-1" fieldName="Riverside Pitch" />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid booking request.');
    });
    expect(screen.queryByText(/SENTINEL_TOKEN_12345/i)).not.toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
    expect(screen.queryByText(/nearest available windows/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the frontend hardcoded message for an unmapped (500) error, never the backend error text', async () => {
    mockFetchOnce({ error: 'BookingCreateError: connection to bookings-db refused' }, 500);

    render(<BookingForm fieldId="field-1" fieldName="Riverside Pitch" />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unable to create the booking right now. Please try again shortly.',
      );
    });
    expect(screen.queryByText(/bookings-db/i)).not.toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
    expect(screen.queryByText(/nearest available windows/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
