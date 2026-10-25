import { FormEvent, useEffect, useRef, useState } from 'react';
import { askQuestion } from '../services/assistantApi';
import { fetchAllBookings, Booking } from '../services/bookingsApi';
import { fetchAvailableFields, Field } from '../services/fieldsApi';
import { fetchOpenIssues, SchedulingIssue } from '../services/schedulingIssuesApi';
import { buildAssistantIntentAnswer, matchAssistantIntent } from '../utils/assistantIntents';

// Every chat interaction is logged to the audit trail under this actor name
// (see backend/src/services/assistantService.ts's logInteraction). The old
// "Ask a question" page asked a customer to type their own name for this;
// GoalKick AI is reframed as a facility-management assistant (every
// suggested question is about running the facility, not booking a field as
// a customer), so there's no one person to name here - "Facility Manager"
// is an honest, fixed actor rather than inventing a fake per-session identity.
const ASSISTANT_ACTOR = 'Facility Manager';

const SUGGESTED_QUESTIONS = [
  'What fields are available today?',
  'How many bookings do we have today?',
  'Are there any scheduling conflicts?',
  'Which field is booked the most?',
  'What are the busiest booking times?',
  "Show me today's upcoming bookings.",
];

// A real chat response here is either an instant local calculation or a
// network round trip to the existing deterministic assistant - neither takes
// long enough for the typing indicator to actually be visible to a person.
// This is a UI pacing floor, not a claim about how hard the "AI" is working.
const MIN_TYPING_DELAY_MS = 450;

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

type DataState = 'loading' | 'error' | 'ready';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function GoalKickAIWidget() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [fields, setFields] = useState<Field[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openIssues, setOpenIssues] = useState<SchedulingIssue[]>([]);
  const [dataState, setDataState] = useState<DataState>('loading');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      sender: 'ai',
      text: "Hi, I'm GoalKick AI. Ask me anything about your fields, bookings, or schedules — or try one of the questions below.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetched once on mount (the widget lives for the whole app session, not
  // just while the panel happens to be open) so data is usually already
  // ready by the time someone opens it, same as the notification bell.
  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAvailableFields(), fetchAllBookings(), fetchOpenIssues()])
      .then(([fieldsData, bookingsData, issuesData]) => {
        if (cancelled) return;
        setFields(fieldsData);
        setBookings(bookingsData);
        setOpenIssues(issuesData);
        setDataState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setDataState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isTyping, open]);

  async function handleAsk(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isTyping) return;

    setSendError(null);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, sender: 'user', text: trimmed, timestamp: new Date().toISOString() },
    ]);
    setDraft('');
    setIsTyping(true);

    const intent = matchAssistantIntent(trimmed);

    try {
      let answerText: string;

      if (intent) {
        const [computed] = await Promise.all([
          Promise.resolve(buildAssistantIntentAnswer(intent, { fields, bookings, openIssues })),
          wait(MIN_TYPING_DELAY_MS),
        ]);
        answerText = computed;
      } else {
        const [result] = await Promise.all([askQuestion(ASSISTANT_ACTOR, trimmed), wait(MIN_TYPING_DELAY_MS)]);
        if (result.status === 'error') {
          setSendError(result.message);
          setIsTyping(false);
          return;
        }
        answerText = result.result.answer;
      }

      setMessages((current) => [
        ...current,
        { id: `ai-${Date.now()}`, sender: 'ai', text: answerText, timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleAsk(draft);
  }

  return (
    <div className="gk-ai-widget" ref={containerRef}>
      {open && (
        <div className="gk-chat gk-chat--floating" aria-label="GoalKick AI">
          <div className="gk-chat__header">
            <span className="gk-chat__avatar" aria-hidden="true">
              ⚽
            </span>
            <div>
              <h2 className="gk-chat__title">GoalKick AI</h2>
              <p className="gk-chat__subtitle">Your soccer facility assistant</p>
            </div>
            <button
              type="button"
              className="gk-ai-widget__close"
              onClick={() => setOpen(false)}
              aria-label="Close GoalKick AI panel"
            >
              ×
            </button>
          </div>
          <p className="gk-chat__description">Ask me about bookings, fields, schedules, and facility activity.</p>

          {dataState === 'error' && (
            <p role="alert">I couldn't load the latest facility data, so some answers may be out of date. Please try again shortly.</p>
          )}

          <div className="gk-chat__suggestions">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="gk-chat-suggestion"
                onClick={() => void handleAsk(question)}
                disabled={isTyping || dataState === 'loading'}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="gk-chat__messages">
            {messages.map((message) => (
              <div key={message.id} className={`gk-chat-message gk-chat-message--${message.sender}`}>
                {message.sender === 'ai' && (
                  <span className="gk-chat-avatar gk-chat-avatar--small" aria-hidden="true">
                    ⚽
                  </span>
                )}
                <div className={`gk-chat-bubble gk-chat-bubble--${message.sender}`}>
                  <p className="gk-chat-bubble__text">{message.text}</p>
                  <span className="gk-chat-bubble__time">{formatTimestamp(message.timestamp)}</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="gk-chat-message gk-chat-message--ai">
                <span className="gk-chat-avatar gk-chat-avatar--small" aria-hidden="true">
                  ⚽
                </span>
                <div className="gk-chat-bubble gk-chat-bubble--ai gk-chat-typing" aria-label="GoalKick AI is typing">
                  <span className="gk-chat-typing__dot" />
                  <span className="gk-chat-typing__dot" />
                  <span className="gk-chat-typing__dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {sendError && <p role="alert">{sendError}</p>}

          <form className="gk-chat-input-bar" onSubmit={handleSubmit}>
            <input
              type="text"
              className="gk-chat-input"
              placeholder="Ask GoalKick AI..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isTyping || dataState === 'loading'}
              aria-label="Ask GoalKick AI"
            />
            <button
              type="submit"
              className="gk-button gk-button--primary"
              disabled={isTyping || dataState === 'loading' || !draft.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="gk-ai-widget__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={open ? 'Close GoalKick AI' : 'Open GoalKick AI'}
      >
        ⚽
      </button>
    </div>
  );
}
