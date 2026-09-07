import { useEffect, useState } from 'react';
import { fetchOpenIssues, SchedulingIssue } from '../services/schedulingIssuesApi';
import { SchedulingIssueCard } from '../components/SchedulingIssueCard';

type LoadState = 'loading' | 'error' | 'ready';

export function SchedulingIssuesPage() {
  const [issues, setIssues] = useState<SchedulingIssue[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    fetchOpenIssues()
      .then((data) => {
        if (cancelled) return;
        setIssues(data);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleResolved(id: string) {
    setIssues((current) => current.filter((i) => i.id !== id));
  }

  if (state === 'loading') {
    return <p>Loading scheduling issues…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load scheduling issues right now. Please try again shortly.</p>;
  }

  if (issues.length === 0) {
    return <p>No scheduling issues need attention right now.</p>;
  }

  return (
    <div>
      <h1>Scheduling issues</h1>
      <ul>
        {issues.map((issue) => (
          <SchedulingIssueCard key={issue.id} issue={issue} onResolved={handleResolved} />
        ))}
      </ul>
    </div>
  );
}
