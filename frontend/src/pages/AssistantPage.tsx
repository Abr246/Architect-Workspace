import { FormEvent, useState } from 'react';
import { askQuestion } from '../services/assistantApi';

interface Exchange {
  question: string;
  answer: string;
  understood: boolean;
}

export function AssistantPage() {
  const [customerName, setCustomerName] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<Exchange[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const askedQuestion = question;
    const outcome = await askQuestion(customerName, askedQuestion);

    setSubmitting(false);

    if (outcome.status === 'answered') {
      setLog((current) => [...current, { question: askedQuestion, ...outcome.result }]);
      setQuestion('');
    } else {
      setError(outcome.message);
    }
  }

  return (
    <div>
      <h1>Ask a question</h1>
      <p>Ask about field pricing or availability and get an instant answer.</p>
      <ul>
        {log.map((exchange, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i}>
            <p>
              <strong>You:</strong> {exchange.question}
            </p>
            <p>
              <strong>Assistant:</strong> {exchange.answer}
            </p>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <label>
          Your name
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </label>
        <label>
          Question
          <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Asking…' : 'Ask'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </div>
  );
}
