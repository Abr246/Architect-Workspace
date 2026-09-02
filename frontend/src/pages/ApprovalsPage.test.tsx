import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalsPage } from './ApprovalsPage';

const pendingEscalation = {
  id: 'escalation-1',
  type: 'refund' as const,
  customerName: 'Alice',
  description: 'Double charged for the same slot',
  status: 'pending' as const,
  createdAt: '2026-09-02T00:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
  decisionNotes: null,
};

function mockFetchJsonOnce(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('ApprovalsPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows pending escalations fetched from the API', async () => {
    mockFetchJsonOnce({ escalations: [pendingEscalation] });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText(/refund request/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
  });

  it('shows an empty state when nothing is pending', async () => {
    mockFetchJsonOnce({ escalations: [] });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no refunds or complaints/i)).toBeInTheDocument();
    });
  });

  it('approving an escalation removes it from the list', async () => {
    mockFetchJsonOnce({ escalations: [pendingEscalation] });
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/refund request/i)).toBeInTheDocument());

    mockFetchJsonOnce({ escalation: { ...pendingEscalation, status: 'approved', decidedBy: 'Manager Mo' } }, 200);

    await userEvent.type(screen.getByLabelText(/decided by/i), 'Manager Mo');
    await userEvent.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/refund request/i)).not.toBeInTheDocument();
    });
  });

  it('shows an error and keeps the escalation listed if the decision fails', async () => {
    mockFetchJsonOnce({ escalations: [pendingEscalation] });
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/refund request/i)).toBeInTheDocument());

    mockFetchJsonOnce({ error: 'Escalation escalation-1 was already approved by Someone Else.' }, 409);

    await userEvent.type(screen.getByLabelText(/decided by/i), 'Manager Mo');
    await userEvent.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already approved/i);
    });
    expect(screen.getByText(/refund request/i)).toBeInTheDocument();
  });
});
