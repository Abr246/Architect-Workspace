import request from 'supertest';
import { createApp } from '../app';
import * as customerServiceService from '../services/customerServiceService';
import * as escalationsService from '../services/escalationsService';

describe('POST /api/customer-service/issues', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 resolved for a question the AI can answer', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/customer-service/issues')
      .send({ customerName: 'Priya', issue: 'How much does it cost?' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });

  it('returns 200 escalated for a refund request', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/customer-service/issues')
      .send({ customerName: 'Priya', issue: 'I would like a refund' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('escalated');
    expect(res.body.escalationId).toEqual(expect.any(String));
  });

  it('returns 400 for a missing issue', async () => {
    const app = createApp();
    const res = await request(app).post('/api/customer-service/issues').send({ customerName: 'Priya' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a missing customerName', async () => {
    const app = createApp();
    const res = await request(app).post('/api/customer-service/issues').send({ issue: 'How much does it cost?' });

    expect(res.status).toBe(400);
  });

  it('returns 500 with a safe message when the service fails unexpectedly', async () => {
    jest.spyOn(customerServiceService, 'handleCustomerIssue').mockImplementation(() => {
      throw new Error('simulated unexpected failure');
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/customer-service/issues')
      .send({ customerName: 'Priya', issue: 'How much does it cost?' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('simulated unexpected failure');
  });
});

describe('GET /api/customer-service/issues/:escalationId', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with the escalation once one exists', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/api/customer-service/issues')
      .send({ customerName: 'Priya', issue: 'I would like a refund' });

    const res = await request(app).get(`/api/customer-service/issues/${created.body.escalationId}`);

    expect(res.status).toBe(200);
    expect(res.body.escalation.id).toBe(created.body.escalationId);
    expect(res.body.escalation.customerNotifiedAt).toBeNull();
  });

  it('returns 404 for an escalation id that does not exist', async () => {
    const app = createApp();
    const res = await request(app).get('/api/customer-service/issues/escalation-does-not-exist');

    expect(res.status).toBe(404);
  });

  it('returns 500 with a safe message when the lookup fails unexpectedly', async () => {
    jest.spyOn(escalationsService, 'getEscalationById').mockImplementation(() => {
      throw new Error('simulated unexpected failure');
    });

    const app = createApp();
    const res = await request(app).get('/api/customer-service/issues/escalation-1');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('simulated unexpected failure');
  });
});
