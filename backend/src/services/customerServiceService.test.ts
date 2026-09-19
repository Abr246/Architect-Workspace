import { handleCustomerIssue } from './customerServiceService';
import { resetEscalations, listEscalations } from './escalationsService';
import { resetAuditTrail, listAuditEntries } from './auditTrailService';
import * as assistantService from './assistantService';
import * as escalationsService from './escalationsService';

describe('handleCustomerIssue', () => {
  beforeEach(() => {
    resetEscalations();
    resetAuditTrail();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves a question the AI understands (acceptance criterion 1, resolved branch)', () => {
    const result = handleCustomerIssue('Priya', 'How much does it cost?');

    expect(result.status).toBe('resolved');
    expect(result.message).toMatch(/pricing/i);
    expect(result.escalationId).toBeNull();
  });

  it('escalates a refund request without ever asking the AI (REQ-012 detection)', () => {
    const answerSpy = jest.spyOn(assistantService, 'answerQuestion');

    const result = handleCustomerIssue('Priya', 'I would like a refund for my booking');

    expect(result.status).toBe('escalated');
    expect(result.escalationId).not.toBeNull();
    expect(answerSpy).not.toHaveBeenCalled();

    const [escalation] = listEscalations();
    expect(escalation.type).toBe('refund');
  });

  it('escalates a complaint without ever asking the AI', () => {
    const result = handleCustomerIssue('Priya', 'I am very unhappy with the service');

    expect(result.status).toBe('escalated');
    const [escalation] = listEscalations();
    expect(escalation.type).toBe('complaint');
  });

  it('escalates as "general" when the AI cannot understand the issue and it is not a refund/complaint (acceptance criterion 1, escalated branch)', () => {
    const result = handleCustomerIssue('Priya', 'My dog ate my cleats, what do I do');

    expect(result.status).toBe('escalated');
    const [escalation] = listEscalations();
    expect(escalation.type).toBe('general');
  });

  it('declines an empty issue rather than guessing', () => {
    const result = handleCustomerIssue('Priya', '   ');

    expect(result.status).toBe('failed');
    expect(result.escalationId).toBeNull();
  });

  it('falls back to escalating when the AI itself throws ("AI handling error")', () => {
    jest.spyOn(assistantService, 'answerQuestion').mockImplementation(() => {
      throw new Error('simulated AI failure');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = handleCustomerIssue('Priya', 'What times are available this weekend?');

    expect(result.status).toBe('escalated');
    expect(result.escalationId).not.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('fails honestly, without crashing or fabricating a resolution, when escalation itself fails ("Escalation failure")', () => {
    jest.spyOn(escalationsService, 'createEscalation').mockImplementation(() => {
      throw new Error('simulated escalation failure');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = handleCustomerIssue('Priya', 'I need a refund');

    expect(result.status).toBe('failed');
    expect(result.escalationId).toBeNull();
    expect(result.message).toMatch(/trouble reaching our team/i);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs every resolved or escalated interaction with resolution details ("Trust" acceptance criterion)', () => {
    handleCustomerIssue('Priya', 'How much does it cost?');
    handleCustomerIssue('Priya', 'I need a refund');

    const entries = listAuditEntries().filter((e) => e.entityType === 'customer_issue');
    expect(entries).toHaveLength(2);
    expect(entries.some((e) => e.action === 'resolved')).toBe(true);
    expect(entries.some((e) => e.action === 'escalated')).toBe(true);
    expect(entries.every((e) => (e.details as { resolution: string }).resolution)).toBe(true);
  });
});
