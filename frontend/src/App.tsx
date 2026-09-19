import { useState } from 'react';
import { FieldsAvailabilityPage } from './pages/FieldsAvailabilityPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { SchedulingIssuesPage } from './pages/SchedulingIssuesPage';
import { AssistantPage } from './pages/AssistantPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';
import { GetHelpPage } from './pages/GetHelpPage';
import { ErrorBoundary } from './components/ErrorBoundary';

type View = 'booking' | 'approvals' | 'scheduling-issues' | 'assistant' | 'analytics' | 'get-help';

function App() {
  const [view, setView] = useState<View>('booking');

  return (
    <ErrorBoundary>
      <nav>
        <button type="button" onClick={() => setView('booking')} aria-current={view === 'booking'}>
          Book a field
        </button>
        <button type="button" onClick={() => setView('approvals')} aria-current={view === 'approvals'}>
          Approvals
        </button>
        <button
          type="button"
          onClick={() => setView('scheduling-issues')}
          aria-current={view === 'scheduling-issues'}
        >
          Scheduling issues
        </button>
        <button type="button" onClick={() => setView('assistant')} aria-current={view === 'assistant'}>
          Ask a question
        </button>
        <button type="button" onClick={() => setView('analytics')} aria-current={view === 'analytics'}>
          Analytics
        </button>
        <button type="button" onClick={() => setView('get-help')} aria-current={view === 'get-help'}>
          Get help
        </button>
      </nav>
      {view === 'booking' && <FieldsAvailabilityPage />}
      {view === 'approvals' && <ApprovalsPage />}
      {view === 'scheduling-issues' && <SchedulingIssuesPage />}
      {view === 'assistant' && <AssistantPage />}
      {view === 'analytics' && <AnalyticsDashboardPage />}
      {view === 'get-help' && <GetHelpPage />}
    </ErrorBoundary>
  );
}

export default App;
