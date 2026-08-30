import { render, screen } from '@testing-library/react';
import App from './App';

test('renders without crashing while fields are loading', () => {
  // Never-resolving fetch keeps the component in its initial loading state
  // for the life of this test, so there's no async state update after the
  // test finishes to trigger an act() warning.
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

  render(<App />);
  expect(screen.getByText(/loading available fields/i)).toBeInTheDocument();

  jest.restoreAllMocks();
});
