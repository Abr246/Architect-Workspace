import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldDetailsPage } from './FieldDetailsPage';
import { todayLocalDateString } from '../utils/timeSlots';

const field = {
  id: 'field-1',
  name: 'Riverside Pitch',
  location: 'North Park',
  surfaceType: 'grass',
  pricePerHour: 40,
  available: true,
  sizeFormat: '11v11',
  description: 'A full-size grass pitch nestled along the river.',
  amenities: ['Parking', 'Restrooms', 'Lighting'],
};

// A date far enough in the future that every hour in the grid is always
// "available" or "booked," never "past" - picking a specific hour on
// *today's* date is time-of-day-dependent (4 PM may already be gone by the
// time this test actually runs) and was a real bug caught while writing
// this file, same category as the earlier BookingForm timezone bug.
function futureDateString(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoForLocalHour(dateStr: string, hour: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

async function flushMicrotasks(times = 8) {
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function mockBookings(bookings: unknown[] = [], fail = false) {
  return jest.spyOn(global, 'fetch').mockImplementation((() => {
    if (fail) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ bookings }) } as Response);
  }) as typeof fetch);
}

describe('FieldDetailsPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows all the real field details: name, location, price, surface, size, description, and amenities', async () => {
    mockBookings([]);

    render(<FieldDetailsPage field={field} onBack={jest.fn()} onBook={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Riverside Pitch' })).toBeInTheDocument();
    expect(screen.getByText(/north park/i)).toBeInTheDocument();
    expect(screen.getByText('$40/hr')).toBeInTheDocument();
    expect(screen.getByText('grass')).toBeInTheDocument();
    expect(screen.getByText('11v11')).toBeInTheDocument();
    expect(screen.getByText(/full-size grass pitch/i)).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Restrooms')).toBeInTheDocument();
    expect(screen.getByText('Lighting')).toBeInTheDocument();

    // Let the bookings-preview fetch this page kicks off on mount settle
    // before the test ends, so its state update isn't left dangling outside
    // of act() and logging a warning.
    await flushMicrotasks();
  });

  it('defaults the date picker to today', async () => {
    mockBookings([]);

    render(<FieldDetailsPage field={field} onBack={jest.fn()} onBook={jest.fn()} />);

    expect(screen.getByLabelText(/date/i)).toHaveValue(todayLocalDateString());

    await flushMicrotasks();
  });

  it('marks a booked hour as Booked and disabled, leaving other hours Available', async () => {
    const date = futureDateString(7);
    mockBookings([
      {
        id: 'booking-existing',
        fieldId: 'field-1',
        customerName: 'Bob',
        startTime: isoForLocalHour(date, 16),
        endTime: isoForLocalHour(date, 17),
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'confirmed',
      },
    ]);

    render(<FieldDetailsPage field={field} onBack={jest.fn()} onBook={jest.fn()} />);
    fireEvent.change(await screen.findByLabelText(/date/i), { target: { value: date } });

    const bookedButton = await screen.findByRole('button', { name: /4:00 pm.*booked/i });
    expect(bookedButton).toBeDisabled();

    const availableButton = screen.getByRole('button', { name: /5:00 pm.*available/i });
    expect(availableButton).not.toBeDisabled();
  });

  it('recomputes availability when the date changes', async () => {
    const bookedDate = futureDateString(7);
    const otherDate = futureDateString(8);

    mockBookings([
      {
        id: 'booking-existing',
        fieldId: 'field-1',
        customerName: 'Bob',
        startTime: isoForLocalHour(bookedDate, 16),
        endTime: isoForLocalHour(bookedDate, 17),
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'confirmed',
      },
    ]);

    render(<FieldDetailsPage field={field} onBack={jest.fn()} onBook={jest.fn()} />);
    fireEvent.change(await screen.findByLabelText(/date/i), { target: { value: bookedDate } });
    await screen.findByRole('button', { name: /4:00 pm.*booked/i });

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: otherDate } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /4:00 pm.*available/i })).toBeInTheDocument();
    });
  });

  it('does not block viewing availability if the booking preview fails to load', async () => {
    mockBookings([], true);

    render(<FieldDetailsPage field={field} onBack={jest.fn()} onBook={jest.fn()} />);
    fireEvent.change(await screen.findByLabelText(/date/i), { target: { value: futureDateString(7) } });

    const slot = await screen.findByRole('button', { name: /4:00 pm.*available/i });
    expect(slot).not.toBeDisabled();
    expect(screen.getByText(/couldn't check which times are already booked/i)).toBeInTheDocument();
  });

  it('calls onBook with the selected date when "Book This Field" is clicked', async () => {
    mockBookings([]);
    const onBook = jest.fn();
    const date = futureDateString(7);

    render(<FieldDetailsPage field={field} onBack={jest.fn()} onBook={onBook} />);
    fireEvent.change(await screen.findByLabelText(/date/i), { target: { value: date } });
    await screen.findByRole('button', { name: /4:00 pm.*available/i });

    await userEvent.click(screen.getByRole('button', { name: /book this field/i }));

    expect(onBook).toHaveBeenCalledWith(date);
  });

  it('calls onBook with the selected date when an available time slot itself is clicked', async () => {
    mockBookings([]);
    const onBook = jest.fn();
    const date = futureDateString(7);

    render(<FieldDetailsPage field={field} onBack={jest.fn()} onBook={onBook} />);
    fireEvent.change(await screen.findByLabelText(/date/i), { target: { value: date } });
    const slot = await screen.findByRole('button', { name: /4:00 pm.*available/i });

    await userEvent.click(slot);

    expect(onBook).toHaveBeenCalledWith(date);
  });

  it('calls onBack when "Back to all fields" is clicked', async () => {
    mockBookings([]);
    const onBack = jest.fn();

    render(<FieldDetailsPage field={field} onBack={onBack} onBook={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /back to all fields/i }));

    expect(onBack).toHaveBeenCalled();

    await flushMicrotasks();
  });
});
