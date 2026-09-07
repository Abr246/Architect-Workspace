import request from 'supertest';
import { createApp } from '../app';
import { resetBookings } from '../services/bookingsService';
import { resetAuditTrail } from '../services/auditTrailService';

const validBooking = {
  fieldId: 'field-1',
  customerName: 'Alice',
  startTime: '2026-09-05T10:00:00.000Z',
  endTime: '2026-09-05T11:00:00.000Z',
};

describe('GET /api/audit-trail', () => {
  beforeEach(() => {
    resetBookings();
    resetAuditTrail();
  });

  it('is accessible and returns every entry across bookings when no filter is given', async () => {
    const app = createApp();
    await request(app).post('/api/bookings').send(validBooking);
    await request(app).post('/api/bookings').send({ ...validBooking, fieldId: 'field-2', customerName: 'Bob' });

    const res = await request(app).get('/api/audit-trail');

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
  });

  it('shows both the created and cancelled entries for a single booking, in order, with timestamps', async () => {
    const app = createApp();
    const created = await request(app).post('/api/bookings').send(validBooking);
    const id = created.body.booking.id;
    await request(app).post(`/api/bookings/${id}/cancel`).send({ customerName: 'Alice' });

    const res = await request(app).get(`/api/audit-trail?entityId=${id}`);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.entries.map((e: { action: string }) => e.action)).toEqual(['created', 'cancelled']);
    expect(res.body.entries.every((e: { timestamp: string }) => typeof e.timestamp === 'string')).toBe(true);
  });

  it('returns an empty list rather than an error when nothing has happened yet', async () => {
    const app = createApp();
    const res = await request(app).get('/api/audit-trail');

    expect(res.status).toBe(200);
    expect(res.body.entries).toEqual([]);
  });
});
