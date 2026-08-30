import { FieldsAvailabilityPage } from './pages/FieldsAvailabilityPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <FieldsAvailabilityPage />
    </ErrorBoundary>
  );
}

export default App;
