import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldsAvailabilityPage } from './FieldsAvailabilityPage';

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const detailedFields = [
  {
    id: 'field-1',
    name: 'Riverside Pitch',
    location: 'North Park',
    surfaceType: 'grass',
    pricePerHour: 40,
    available: true,
    sizeFormat: '11v11',
    description: 'A full-size grass pitch.',
    amenities: ['Parking', 'Restrooms', 'Lighting'],
  },
];

function mockFetchRouter(fieldsBody: unknown, bookingsBody: unknown = { bookings: [] }) {
  return jest.spyOn(global, 'fetch').mockImplementation(((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/bookings')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(bookingsBody) } as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(fieldsBody) } as Response);
  }) as typeof fetch);
}

describe('FieldsAvailabilityPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the available fields once they load', async () => {
    mockFetchOnce({
      fields: [
        { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true },
        { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true },
      ],
    });

    render(<FieldsAvailabilityPage />);

    expect(screen.getByText(/loading available fields/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Riverside Pitch', { exact: false })).toBeInTheDocument();
    });
    expect(screen.getByText('Downtown Turf', { exact: false })).toBeInTheDocument();
  });

  it('shows an error message if the request fails, and never shows a booked field', async () => {
    mockFetchOnce({ error: 'Unable to load fields right now. Please try again shortly.' }, false, 500);

    render(<FieldsAvailabilityPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.queryByText(/riverside pitch/i)).not.toBeInTheDocument();
  });

  it('shows a proper empty state (not a bare sentence) when there are no fields, without losing the page title', async () => {
    mockFetchOnce({ fields: [] });

    render(<FieldsAvailabilityPage />);

    await waitFor(() => {
      expect(screen.getByText(/no fields available right now/i)).toBeInTheDocument();
    });
    // Regression: the empty case used to bypass the page wrapper entirely,
    // so the heading and intro disappeared along with the field grid.
    expect(screen.getByRole('heading', { name: 'Available soccer fields' })).toBeInTheDocument();
  });

  it("clicking a field's name opens its details page", async () => {
    mockFetchRouter({ fields: detailedFields });

    render(<FieldsAvailabilityPage />);
    await waitFor(() => expect(screen.getByText('Riverside Pitch', { exact: false })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Riverside Pitch' }));

    expect(await screen.findByText(/full-size grass pitch/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to all fields/i })).toBeInTheDocument();
  });

  it("clicking a field's image opens its details page", async () => {
    mockFetchRouter({ fields: detailedFields });

    render(<FieldsAvailabilityPage />);
    await waitFor(() => expect(screen.getByText('Riverside Pitch', { exact: false })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /view details for riverside pitch/i }));

    expect(await screen.findByText(/full-size grass pitch/i)).toBeInTheDocument();
  });

  it('"Back to all fields" returns to the grid, and the existing Book Now button still works unchanged', async () => {
    mockFetchRouter({ fields: detailedFields });

    render(<FieldsAvailabilityPage />);
    await waitFor(() => expect(screen.getByText('Riverside Pitch', { exact: false })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Riverside Pitch' }));
    await screen.findByText(/full-size grass pitch/i);

    await userEvent.click(screen.getByRole('button', { name: /back to all fields/i }));

    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /book now/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('"Book This Field" from the details page opens the same booking modal, pre-filled with the previewed date', async () => {
    mockFetchRouter({ fields: detailedFields });

    render(<FieldsAvailabilityPage />);
    await waitFor(() => expect(screen.getByText('Riverside Pitch', { exact: false })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Riverside Pitch' }));
    const dateInput = await screen.findByLabelText(/date/i);

    const futureDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 10);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })();
    fireEvent.change(dateInput, { target: { value: futureDate } });

    await userEvent.click(screen.getByRole('button', { name: /book this field/i }));

    const modal = await screen.findByRole('dialog');
    expect(modal).toHaveTextContent('Riverside Pitch');
    const modalDateInput = screen.getAllByLabelText(/date/i).find((el) => modal.contains(el)) as HTMLInputElement;
    expect(modalDateInput).toHaveValue(futureDate);
  });
});
