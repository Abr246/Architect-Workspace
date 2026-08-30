import { render, screen, waitFor } from '@testing-library/react';
import { FieldsAvailabilityPage } from './FieldsAvailabilityPage';

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
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
});
