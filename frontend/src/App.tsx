import { useState } from 'react';
import { FieldsAvailabilityPage } from './pages/FieldsAvailabilityPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { SchedulingIssuesPage } from './pages/SchedulingIssuesPage';
import { ErrorBoundary } from './components/ErrorBoundary';

type View = 'booking' | 'approvals' | 'scheduling-issues';

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
      </nav>
      {view === 'booking' && <FieldsAvailabilityPage />}
      {view === 'approvals' && <ApprovalsPage />}
      {view === 'scheduling-issues' && <SchedulingIssuesPage />}
    </ErrorBoundary>
  );
}

export default App;
