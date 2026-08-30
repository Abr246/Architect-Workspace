import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches rendering errors from its child tree — this is STORY-001's
// "Frontend display error" failure path. Fetch failures are already
// handled inside FieldsAvailabilityPage's own state machine; this covers
// the other class of failure: a genuine crash while rendering.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] FrontendDisplayError:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <p role="alert">Something went wrong displaying this page. Please refresh and try again.</p>;
    }
    return this.props.children;
  }
}
