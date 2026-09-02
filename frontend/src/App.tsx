import { useState } from 'react';
import { FieldsAvailabilityPage } from './pages/FieldsAvailabilityPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ErrorBoundary } from './components/ErrorBoundary';

type View = 'booking' | 'approvals';

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
      </nav>
      {view === 'booking' ? <FieldsAvailabilityPage /> : <ApprovalsPage />}
    </ErrorBoundary>
  );
}

export default App;
