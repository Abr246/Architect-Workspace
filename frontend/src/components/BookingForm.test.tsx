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

  it('shows the conflict message instead of a confirmation when the field is already booked', async () => {
    mockFetchOnce({ error: 'Field field-1 is already booked for an overlapping time.' }, 409);

    render(<BookingForm fieldId="field-1" fieldName="Riverside Pitch" />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already booked/i);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
