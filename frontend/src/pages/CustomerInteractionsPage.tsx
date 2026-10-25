import { useEffect, useRef, useState } from 'react';
import { fetchAuditEntries, stringDetail, booleanDetail, nullableStringDetail } from '../services/auditTrailApi';
import { fetchAllEscalations, Escalation } from '../services/escalationsApi';

type LoadState = 'loading' | 'error' | 'ready';

export const INTERACTIONS_POLL_INTERVAL_MS = 5000;

interface QuestionRow {
  id: string;
  askedBy: string;
  question: string;
  answer: string;
  understood: boolean;
  timestamp: string;
}

type HelpOutcome = 'resolved-by-ai' | 'pending' | 'approved' | 'denied';

interface HelpRequestRow {
  id: string;
  from: string;
  issue: string;
  outcome: HelpOutcome;
  timestamp: string;
}

function helpOutcomeLabel(outcome: HelpOutcome): string {
  switch (outcome) {
    case 'resolved-by-ai':
      return 'Resolved by AI';
    case 'pending':
      return 'Pending review';
    case 'approved':
      return 'Approved';
    case 'denied':
      return 'Denied';
    default:
      return outcome;
  }
}

function helpOutcomeBadgeVariant(outcome: HelpOutcome): 'available' | 'warning' | 'danger' {
  switch (outcome) {
    case 'resolved-by-ai':
    case 'approved':
      return 'available';
    case 'denied':
      return 'danger';
    case 'pending':
    default:
      return 'warning';
  }
}

export function CustomerInteractionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequestRow[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function fetchData(): Promise<void> {
    return Promise.all([
      fetchAuditEntries('ai_interaction'),
      fetchAuditEntries('customer_issue'),
      fetchAllEscalations(),
    ]).then(([aiEntries, issueEntries, escalations]) => {
      if (!mountedRef.current) return;

      const questionRows: QuestionRow[] = aiEntries.map((entry) => ({
        id: entry.id,
        askedBy: entry.actor,
        question: stringDetail(entry.details, 'question'),
        answer: stringDetail(entry.details, 'answer'),
        understood: booleanDetail(entry.details, 'understood'),
        timestamp: entry.timestamp,
      }));

      const escalationsById = new Map<string, Escalation>(escalations.map((e) => [e.id, e]));

      // Only the *original submission* entries carry an `issue` field -
      // customerServiceService writes those. escalationsService later adds
      // its own 'resolved' entry for the human-decision outcome, sharing
      // the same entityId but a different details shape (decision/notes,
      // no `issue`) - excluding those here avoids double-counting one
      // help request as two rows.
      const helpRows: HelpRequestRow[] = issueEntries
        .filter((entry) => typeof entry.details.issue === 'string')
        .map((entry) => {
          const escalationId = nullableStringDetail(entry.details, 'escalationId');
          const outcome: HelpOutcome = escalationId ? escalationsById.get(escalationId)?.status ?? 'pending' : 'resolved-by-ai';

          return {
            id: entry.id,
            from: entry.actor,
            issue: stringDetail(entry.details, 'issue'),
            outcome,
            timestamp: entry.timestamp,
          };
        });

      questionRows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      helpRows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setQuestions(questionRows);
      setHelpRequests(helpRows);
    });
  }

  function load() {
    setState('loading');
    fetchData()
      .then(() => {
        if (mountedRef.current) setState('ready');
      })
      .catch(() => {
        if (mountedRef.current) setState('error');
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  // Same rationale as BookingsPage: silent background refresh, last-known-
  // good data stays on screen if a poll fails, manual Refresh remains for
  // an explicit on-demand check.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData().catch(() => {
        // Retried automatically on the next tick.
      });
    }, INTERACTIONS_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return <p className="gk-status">Loading customer interactions…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load customer interactions right now. Please try again shortly.</p>;
  }

  return (
    <div className="gk-page">
      <div className="gk-page__header">
        <h1>Customer interactions</h1>
        <button type="button" className="gk-button gk-button--secondary" onClick={load}>
          Refresh
        </button>
      </div>
      <p className="gk-page__intro">
        Updates automatically every {INTERACTIONS_POLL_INTERVAL_MS / 1000} seconds.
      </p>

      <h2>Questions asked</h2>
      {questions.length === 0 ? (
        <p className="gk-empty-row">
          <span className="gk-empty-row__icon" aria-hidden="true">💬</span>
          No questions have been asked yet.
        </p>
      ) : (
        <table className="gk-table">
          <thead>
            <tr>
              <th>Asked by</th>
              <th>Question</th>
              <th>Answer</th>
              <th>Understood?</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((row) => (
              <tr key={row.id}>
                <td>{row.askedBy}</td>
                <td>{row.question}</td>
                <td>{row.answer}</td>
                <td>{row.understood ? 'Yes' : 'No'}</td>
                <td>{new Date(row.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Help requests</h2>
      {helpRequests.length === 0 ? (
        <p className="gk-empty-row">
          <span className="gk-empty-row__icon" aria-hidden="true">🙋</span>
          No help requests have been submitted yet.
        </p>
      ) : (
        <table className="gk-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Issue</th>
              <th>Outcome</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {helpRequests.map((row) => (
              <tr key={row.id}>
                <td>{row.from}</td>
                <td>{row.issue}</td>
                <td>
                  <span className={`gk-badge gk-badge--${helpOutcomeBadgeVariant(row.outcome)}`}>
                    <span className="gk-badge__dot" aria-hidden="true" />
                    {helpOutcomeLabel(row.outcome)}
                  </span>
                </td>
                <td>{new Date(row.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
