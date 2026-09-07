import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantPage } from './AssistantPage';

function mockFetchJsonOnce(body: unknown, status = 200) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

async function askQuestion(question: string) {
  await userEvent.type(screen.getByLabelText(/your name/i), 'Mia');
  await userEvent.type(screen.getByLabelText(/question/i), question);
  await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));
}

describe('AssistantPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a relevant answer after asking a pricing question', async () => {
    mockFetchJsonOnce({ answer: "Here's our current pricing: Riverside Pitch: $40/hr.", understood: true });

    render(<AssistantPage />);
    await askQuestion('How much does it cost?');

    await waitFor(() => {
      expect(screen.getByText(/riverside pitch: \$40\/hr/i)).toBeInTheDocument();
    });

    const [, body] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(body.body)).toMatchObject({ customerName: 'Mia', question: 'How much does it cost?' });
  });

  it("shows the decline message for a question outside the AI's knowledge", async () => {
    mockFetchJsonOnce({
      answer: "I'm not able to answer that yet — I can help with questions about field pricing and availability.",
      understood: false,
    });

    render(<AssistantPage />);
    await askQuestion('What is the weather like?');

    await waitFor(() => {
      expect(screen.getByText(/not able to answer/i)).toBeInTheDocument();
    });
  });

  it('keeps a running log of multiple questions and answers', async () => {
    mockFetchJsonOnce({ answer: 'Answer one.', understood: true });
    render(<AssistantPage />);
    await askQuestion('Question one?');
    await waitFor(() => expect(screen.getByText('Answer one.')).toBeInTheDocument());

    mockFetchJsonOnce({ answer: 'Answer two.', understood: true });
    await userEvent.type(screen.getByLabelText(/question/i), 'Question two?');
    await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(screen.getByText('Answer two.')).toBeInTheDocument());
    // The first exchange is still there too — nothing got replaced.
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
  });

  it('shows an error message if the request fails, without crashing', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));

    render(<AssistantPage />);
    await askQuestion('How much does it cost?');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
