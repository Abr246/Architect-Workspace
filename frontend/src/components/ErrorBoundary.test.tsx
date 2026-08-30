import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('simulated render crash');
}

describe('ErrorBoundary', () => {
  it('renders a fallback message instead of crashing the whole app', () => {
    // React logs the caught error to console.error by default; suppress
    // that expected noise for this test.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    jest.restoreAllMocks();
  });

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
