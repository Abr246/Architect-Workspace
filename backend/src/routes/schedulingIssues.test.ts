import request from 'supertest';
import { createApp } from '../app';
import { resetBookings } from '../services/bookingsService';
import { resetSchedulingIssues } from '../services/schedulingIssuesService';

const bookingA = { fieldId: 'field-1', customerName: 'Kate', startTime: '2026-09-25T14:00:00.000Z', endTime: '2026-09-25T15:00:00.000Z' };
const bookingB = { fieldId: 'field-1', customerName: 'Leo', startTime: '2026-09-25T14:30:00.000Z', endTime: '2026-09-25T15:30:00.000Z' };

async function createConflict(app: ReturnType<typeof createApp>): Promise<string> {
  await request(app).post('/api/bookings').send(bookingA);
  await request(app).post('/api/bookings').send(bookingB); // conflicts, reports a scheduling issue
  const res = await request(app).get('/api/scheduling-issues?status=open');
  return res.body.issues[0].id as string;
}

describe('GET /api/scheduling-issues', () => {
  beforeEach(() => {
    resetBookings();
    resetSchedulingIssues();
  });

  it('lists open issues after a real conflict occurs', async () => {
    const app = createApp();
    await createConflict(app);

    const res = await request(app).get('/api/scheduling-issues?status=open');

    expect(res.status).toBe(200);
    expect(res.body.issues).toHaveLength(1);
  });

  it('returns 400 for an invalid status filter', async () => {
    const app = createApp();
    const res = await request(app).get('/api/scheduling-issues?status=urgent');

    expect(res.status).toBe(400);
  });

  it('returns an empty list rather than an error when nothing has happened yet', async () => {
    const app = createApp();
    const res = await request(app).get('/api/scheduling-issues');

    expect(res.status).toBe(200);
    expect(res.body.issues).toEqual([]);
  });
});

describe('POST /api/scheduling-issues/:id/resolve', () => {
  beforeEach(() => {
    resetBookings();
    resetSchedulingIssues();
  });

  it('resolves an issue and returns 200', async () => {
    const app = createApp();
    const id = await createConflict(app);

    const res = await request(app).post(`/api/scheduling-issues/${id}/resolve`).send({ resolvedBy: 'Scheduler Sam' });

    expect(res.status).toBe(200);
    expect(res.body.issue.status).toBe('resolved');
  });

  it('is idempotent — resolving twice still returns 200 without error', async () => {
    const app = createApp();
    const id = await createConflict(app);
    await request(app).post(`/api/scheduling-issues/${id}/resolve`).send({ resolvedBy: 'Scheduler Sam' });

    const res = await request(app).post(`/api/scheduling-issues/${id}/resolve`).send({ resolvedBy: 'Scheduler Sam' });

    expect(res.status).toBe(200);
  });

  it('returns 404 for an issue that does not exist', async () => {
    const app = createApp();
    const res = await request(app).post('/api/scheduling-issues/issue-999/resolve').send({ resolvedBy: 'Scheduler Sam' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for a missing resolvedBy', async () => {
    const app = createApp();
    const id = await createConflict(app);

    const res = await request(app).post(`/api/scheduling-issues/${id}/resolve`).send({});

    expect(res.status).toBe(400);
  });
});
