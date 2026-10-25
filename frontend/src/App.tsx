import { useState } from 'react';
import './App.css';
import { useTheme } from './hooks/useTheme';
import { DashboardPage } from './pages/DashboardPage';
import { FieldsAvailabilityPage } from './pages/FieldsAvailabilityPage';
import { BookingsPage } from './pages/BookingsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { SchedulingIssuesPage } from './pages/SchedulingIssuesPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';
import { GetHelpPage } from './pages/GetHelpPage';
import { CustomerInteractionsPage } from './pages/CustomerInteractionsPage';
import { NotificationBell } from './components/NotificationBell';
import { GoalKickAIWidget } from './components/GoalKickAIWidget';
import { ErrorBoundary } from './components/ErrorBoundary';

type View =
  | 'dashboard'
  | 'booking'
  | 'bookings'
  | 'approvals'
  | 'scheduling-issues'
  | 'analytics'
  | 'get-help'
  | 'interactions';

function App() {
  const [view, setView] = useState<View>('booking');
  const [theme, toggleTheme] = useTheme();

  function tabProps(tab: View) {
    return { 'aria-current': (view === tab ? 'page' : undefined) as 'page' | undefined };
  }

  return (
    <div className="gk-app">
      <header className="gk-header">
        <div className="gk-header__brand">
          <span className="gk-brand">GoalKick</span>
          <p className="gk-tagline">Soccer field booking &amp; management</p>
        </div>
        <div className="gk-header__actions">
          <NotificationBell onNavigate={setView} />
          <button
            type="button"
            className="gk-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>
      <nav className="gk-nav">
        <button type="button" className="gk-nav__tab" onClick={() => setView('dashboard')} {...tabProps('dashboard')}>
          Dashboard
        </button>
        <button type="button" className="gk-nav__tab" onClick={() => setView('booking')} {...tabProps('booking')}>
          Book a field
        </button>
        <button type="button" className="gk-nav__tab" onClick={() => setView('bookings')} {...tabProps('bookings')}>
          All bookings
        </button>
        <button
          type="button"
          className="gk-nav__tab"
          onClick={() => setView('approvals')}
          {...tabProps('approvals')}
        >
          Approvals
        </button>
        <button
          type="button"
          className="gk-nav__tab"
          onClick={() => setView('scheduling-issues')}
          {...tabProps('scheduling-issues')}
        >
          Scheduling issues
        </button>
        <button
          type="button"
          className="gk-nav__tab"
          onClick={() => setView('analytics')}
          {...tabProps('analytics')}
        >
          Analytics
        </button>
        <button
          type="button"
          className="gk-nav__tab"
          onClick={() => setView('get-help')}
          {...tabProps('get-help')}
        >
          Get help
        </button>
        <button
          type="button"
          className="gk-nav__tab"
          onClick={() => setView('interactions')}
          {...tabProps('interactions')}
        >
          Customer interactions
        </button>
      </nav>
      <main className="gk-main">
        <ErrorBoundary>
          {view === 'dashboard' && <DashboardPage onNavigate={setView} />}
          {view === 'booking' && <FieldsAvailabilityPage />}
          {view === 'bookings' && <BookingsPage />}
          {view === 'approvals' && <ApprovalsPage />}
          {view === 'scheduling-issues' && <SchedulingIssuesPage onNavigate={setView} />}
          {view === 'analytics' && <AnalyticsDashboardPage />}
          {view === 'get-help' && <GetHelpPage />}
          {view === 'interactions' && <CustomerInteractionsPage />}
        </ErrorBoundary>
      </main>
      <GoalKickAIWidget />
    </div>
  );
}

export default App;
