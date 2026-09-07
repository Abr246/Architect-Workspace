export interface AssistantAnswer {
  answer: string;
  understood: boolean;
}

export type AskResult = { status: 'answered'; result: AssistantAnswer } | { status: 'error'; message: string };

export async function askQuestion(customerName: string, question: string): Promise<AskResult> {
  try {
    const res = await fetch('/api/assistant/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, question }),
    });

    if (!res.ok) {
      return { status: 'error', message: 'Unable to get an answer right now. Please try again shortly.' };
    }

    const result = await res.json();
    return { status: 'answered', result };
  } catch {
    return { status: 'error', message: 'Unable to get an answer right now. Please try again shortly.' };
  }
}
