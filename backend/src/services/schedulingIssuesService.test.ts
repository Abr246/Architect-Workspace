import {
  reportSchedulingConflict,
  resolveSchedulingIssue,
  listSchedulingIssues,
  resetSchedulingIssues,
  SchedulingIssueNotFoundError,
} from './schedulingIssuesService';
import { listAuditEntries, resetAuditTrail } from './auditTrailService';

const details = { requestedStartTime: 'a', requestedEndTime: 'b', requestedBy: 'Leo', conflictingBookingId: 'booking-1' };

describe('reportSchedulingConflict', () => {
  beforeEach(() => {
    resetSchedulingIssues();
    resetAuditTrail();
  });

  it('creates an open issue, notified at the same instant it was detected', () => {
    const issue = reportSchedulingConflict('field-1', details);

    expect(issue.status).toBe('open');
    expect(issue.notifiedAt).toBe(issue.detectedAt);
    expect(issue.fieldId).toBe('field-1');
  });

  it('records an audit entry for the detection', () => {
    const issue = reportSchedulingConflict('field-1', details);

    const entries = listAuditEntries(issue.id);

    expect(entries).toHaveLength(1);
    expect(entries[0].entityType).toBe('scheduling_issue');
    expect(entries[0].action).toBe('detected');
    expect(entries[0].actor).toBe('system');
  });

  it('logs the notification with a timestamp ("Scheduling conflicts are not detected" prevention)', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    reportSchedulingConflict('field-1', details);

    const logged = logSpy.mock.calls
      .map((call) => JSON.parse(call[0] as string))
      .find((entry) => entry.event === 'scheduling_issue_detected');
    expect(logged).toBeDefined();
    expect(logged.timestamp).toEqual(expect.any(String));

    logSpy.mockRestore();
  });
});

describe('resolveSchedulingIssue', () => {
  beforeEach(() => {
    resetSchedulingIssues();
    resetAuditTrail();
  });

  it('resolves an open issue', () => {
    const issue = reportSchedulingConflict('field-1', details);

    const { issue: resolved, resolved: wasResolved } = resolveSchedulingIssue(issue.id, 'Scheduler Sam', 'Rebooked.');

    expect(wasResolved).toBe(true);
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedBy).toBe('Scheduler Sam');
  });

  it('is idempotent — resolving twice does not re-process (resolvedAt unchanged)', () => {
    const issue = reportSchedulingConflict('field-1', details);
    const first = resolveSchedulingIssue(issue.id, 'Scheduler Sam');

    const second = resolveSchedulingIssue(issue.id, 'Scheduler Sam');

    expect(second.resolved).toBe(false);
    expect(second.issue.resolvedAt).toBe(first.issue.resolvedAt);
  });

  it('throws SchedulingIssueNotFoundError for an id that does not exist', () => {
    expect(() => resolveSchedulingIssue('issue-999', 'Scheduler Sam')).toThrow(SchedulingIssueNotFoundError);
  });

  it('records an audit entry for a real resolution, but not for an idempotent retry', () => {
    const issue = reportSchedulingConflict('field-1', details);
    resolveSchedulingIssue(issue.id, 'Scheduler Sam');
    resolveSchedulingIssue(issue.id, 'Scheduler Sam');

    const entries = listAuditEntries(issue.id);
    const resolvedEntries = entries.filter((e) => e.action === 'resolved');

    expect(resolvedEntries).toHaveLength(1);
  });

  it('removes a resolved issue from the open list ("updates the schedule accordingly")', () => {
    const issue = reportSchedulingConflict('field-1', details);
    resolveSchedulingIssue(issue.id, 'Scheduler Sam');

    expect(listSchedulingIssues('open')).toHaveLength(0);
    expect(listSchedulingIssues('resolved')).toHaveLength(1);
  });
});
