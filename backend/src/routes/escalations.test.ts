import request from 'supertest';
import { createApp } from '../app';
import { resetEscalations } from '../services/escalationsService';

const validBody = {
  type: 'refund',
  customerName: 'Alice',
  description: 'Field was closed for maintenance during my booking',
};

describe('GET /api/escalations', () => {
  beforeEach(() => {
    resetEscalations();
  });

  it('lists all escalations when no status filter is given', async () => {
    const app = createApp();
    await request(app).post('/api/escalations').send(validBody);
    await request(app)
      .post('/api/escalations')
      .send({ type: 'complaint', customerName: 'Bob', description: 'Staff was rude at check-in' });

    const res = await request(app).get('/api/escalations');

    expect(res.status).toBe(200);
    expect(res.body.escalations).toHaveLength(2);
  });

  it('filters to only pending escalations', async () => {
    const app = createApp();
    const created = await request(app).post('/api/escalations').send(validBody);
    await request(app)
      .post(`/api/escalations/${created.body.escalation.id}/decision`)
      .send({ decidedBy: 'Manager Mo', outcome: 'approved' });
    await request(app)
      .post('/api/escalations')
      .send({ type: 'complaint', customerName: 'Bob', description: 'Staff was rude at check-in' });

    const res = await request(app).get('/api/escalations?status=pending');

    expect(res.status).toBe(200);
    expect(res.body.escalations).toHaveLength(1);
    expect(res.body.escalations[0].customerName).toBe('Bob');
  });

  it('returns 400 for an invalid status filter', async () => {
    const app = createApp();
    const res = await request(app).get('/api/escalations?status=urgent');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/escalations', () => {
  beforeEach(() => {
    resetEscalations();
  });

  it('creates a refund escalation and returns 201', async () => {
    const app = createApp();
    const res = await request(app).post('/api/escalations').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.escalation.type).toBe('refund');
    expect(res.body.escalation.status).toBe('pending');
  });

  it('creates a complaint escalation and returns 201', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/escalations')
      .send({ type: 'complaint', customerName: 'Bob', description: 'Staff was rude at check-in' });

    expect(res.status).toBe(201);
    expect(res.body.escalation.type).toBe('complaint');
  });

  it('treats an identical repeat request as an idempotent retry (200, no duplicate)', async () => {
    const app = createApp();
    const first = await request(app).post('/api/escalations').send(validBody);
    const second = await request(app).post('/api/escalations').send(validBody);

    expect(second.status).toBe(200);
    expect(second.body.escalation.id).toBe(first.body.escalation.id);
  });

  it('returns 400 for an invalid type', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/escalations')
      .send({ type: 'praise', customerName: 'Carol', description: 'Great field!' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a missing required field', async () => {
    const app = createApp();
    const res = await request(app).post('/api/escalations').send({ type: 'refund', customerName: 'Dave' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/escalations/:id/decision', () => {
  beforeEach(() => {
    resetEscalations();
  });

  async function createOne(app: ReturnType<typeof createApp>) {
    const res = await request(app).post('/api/escalations').send(validBody);
    return res.body.escalation.id as string;
  }

  it('approves a pending escalation and returns 200', async () => {
    const app = createApp();
    const id = await createOne(app);

    const res = await request(app)
      .post(`/api/escalations/${id}/decision`)
      .send({ decidedBy: 'Manager Mo', outcome: 'approved', notes: 'Confirmed in payment logs' });

    expect(res.status).toBe(200);
    expect(res.body.escalation.status).toBe('approved');
    expect(res.body.escalation.decidedBy).toBe('Manager Mo');
  });

  it('treats an identical decision retry as idempotent (200, does not re-process)', async () => {
    const app = createApp();
    const id = await createOne(app);
    const decision = { decidedBy: 'Manager Mo', outcome: 'approved' };

    const first = await request(app).post(`/api/escalations/${id}/decision`).send(decision);
    const second = await request(app).post(`/api/escalations/${id}/decision`).send(decision);

    expect(second.status).toBe(200);
    expect(second.body.escalation.decidedAt).toBe(first.body.escalation.decidedAt);
  });

  it('returns 409 for a conflicting decision on an already-decided escalation', async () => {
    const app = createApp();
    const id = await createOne(app);
    await request(app).post(`/api/escalations/${id}/decision`).send({ decidedBy: 'Manager Mo', outcome: 'approved' });

    const res = await request(app)
      .post(`/api/escalations/${id}/decision`)
      .send({ decidedBy: 'Manager Mo', outcome: 'denied' });

    expect(res.status).toBe(409);
  });

  it('returns 404 for a decision on an escalation that does not exist', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/escalations/escalation-999/decision')
      .send({ decidedBy: 'Manager Mo', outcome: 'approved' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid outcome', async () => {
    const app = createApp();
    const id = await createOne(app);

    const res = await request(app)
      .post(`/api/escalations/${id}/decision`)
      .send({ decidedBy: 'Manager Mo', outcome: 'maybe' });

    expect(res.status).toBe(400);
  });
});
