import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GetHelpPage } from './GetHelpPage';

function mockFetchJsonOnce(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

async function submitIssue(issue: string) {
  await userEvent.type(screen.getByLabelText(/your name/i), 'Jordan');
  await userEvent.type(screen.getByLabelText(/what's going on/i), issue);
  await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));
}

describe('GetHelpPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the AI\'s resolution immediately for a question it can answer', async () => {
    mockFetchJsonOnce({ status: 'resolved', message: "Here's our current pricing: Riverside Pitch: $40/hr.", escalationId: null });

    render(<GetHelpPage />);
    await submitIssue('How much does it cost?');

    await waitFor(() => {
      expect(screen.getByText(/riverside pitch: \$40\/hr/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /check status/i })).not.toBeInTheDocument();

    const [, body] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(body.body)).toMatchObject({ customerName: 'Jordan', issue: 'How much does it cost?' });
  });

  it('shows an escalation confirmation and offers a status check for a refund request', async () => {
    mockFetchJsonOnce({
      status: 'escalated',
      message: "Thanks — I've passed this to our team, and you'll be notified once it's reviewed.",
      escalationId: 'escalation-1',
    });

    render(<GetHelpPage />);
    await submitIssue('I would like a refund');

    await waitFor(() => {
      expect(screen.getByText(/passed this to our team/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /check status/i })).toBeInTheDocument();
  });

  it('shows the human decision and notification state after checking status', async () => {
    mockFetchJsonOnce({ status: 'escalated', message: 'Escalated.', escalationId: 'escalation-1' });
    render(<GetHelpPage />);
    await submitIssue('I would like a refund');
    await waitFor(() => expect(screen.getByRole('button', { name: /check status/i })).toBeInTheDocument());

    mockFetchJsonOnce({
      escalation: {
        id: 'escalation-1',
        type: 'refund',
        customerName: 'Jordan',
        description: 'I would like a refund',
        status: 'approved',
        createdAt: '2026-09-19T00:00:00.000Z',
        decidedAt: '2026-09-19T00:05:00.000Z',
        decidedBy: 'Manager Mo',
        decisionNotes: null,
        customerNotifiedAt: '2026-09-19T00:05:00.000Z',
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /check status/i }));

    await waitFor(() => {
      expect(screen.getByText(/outcome: approved/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/you've been notified/i)).toBeInTheDocument();
  });

  it('shows a pending message when a human has not decided yet', async () => {
    mockFetchJsonOnce({ status: 'escalated', message: 'Escalated.', escalationId: 'escalation-1' });
    render(<GetHelpPage />);
    await submitIssue('I would like a refund');
    await waitFor(() => expect(screen.getByRole('button', { name: /check status/i })).toBeInTheDocument());

    mockFetchJsonOnce({
      escalation: {
        id: 'escalation-1',
        type: 'refund',
        customerName: 'Jordan',
        description: 'I would like a refund',
        status: 'pending',
        createdAt: '2026-09-19T00:00:00.000Z',
        decidedAt: null,
        decidedBy: null,
        decisionNotes: null,
        customerNotifiedAt: null,
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /check status/i }));

    await waitFor(() => {
      expect(screen.getByText(/still pending review/i)).toBeInTheDocument();
    });
  });

  it('shows an error message if submitting fails, without crashing', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));

    render(<GetHelpPage />);
    await submitIssue('How much does it cost?');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
