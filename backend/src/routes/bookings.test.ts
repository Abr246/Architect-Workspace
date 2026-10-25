import request from 'supertest';
import { createApp } from '../app';
import { resetBookings } from '../services/bookingsService';

const validBody = {
  fieldId: 'field-1',
  customerName: 'Alice',
  startTime: '2026-09-05T10:00:00.000Z',
  endTime: '2026-09-05T11:00:00.000Z',
};

describe('GET /api/bookings', () => {
  beforeEach(() => {
    resetBookings();
  });

  it('returns an empty list when no bookings have been made', async () => {
    const app = createApp();
    const res = await request(app).get('/api/bookings');

    expect(res.status).toBe(200);
    expect(res.body.bookings).toEqual([]);
  });

  it('returns every booking that has been made, including cancelled ones', async () => {
    const app = createApp();
    const created = await request(app).post('/api/bookings').send(validBody);
    await request(app).post(`/api/bookings/${created.body.booking.id}/cancel`).send({ customerName: 'Alice' });

    const res = await request(app).get('/api/bookings');

    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
    expect(res.body.bookings[0]).toMatchObject({
      id: created.body.booking.id,
      fieldId: 'field-1',
      customerName: 'Alice',
      status: 'cancelled',
    });
  });
});

describe('POST /api/bookings', () => {
  beforeEach(() => {
    resetBookings();
  });

  it('creates a booking and returns 201', async () => {
    const app = createApp();
    const res = await request(app).post('/api/bookings').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.booking.fieldId).toBe('field-1');
    expect(res.body.booking.id).toEqual(expect.any(String));
  });

  it('treats an identical repeat request as an idempotent retry (200, no duplicate)', async () => {
    const app = createApp();
    const first = await request(app).post('/api/bookings').send(validBody);
    const second = await request(app).post('/api/bookings').send(validBody);

    expect(second.status).toBe(200);
    expect(second.body.booking.id).toBe(first.body.booking.id);
  });

  it('returns 409 when a different customer requests an overlapping time', async () => {
    const app = createApp();
    await request(app).post('/api/bookings').send(validBody);

    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBody, customerName: 'Bob', startTime: '2026-09-05T10:30:00.000Z', endTime: '2026-09-05T11:30:00.000Z' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already booked/i);
  });

  it('returns 400 for a missing required field', async () => {
    const app = createApp();
    const { customerName, ...withoutCustomerName } = validBody;
    const res = await request(app).post('/api/bookings').send(withoutCustomerName);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when startTime is after endTime', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBody, startTime: '2026-09-05T12:00:00.000Z', endTime: '2026-09-05T11:00:00.000Z' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/bookings/:id/cancel', () => {
  beforeEach(() => {
    resetBookings();
  });

  async function createOne(app: ReturnType<typeof createApp>) {
    const res = await request(app).post('/api/bookings').send(validBody);
    return res.body.booking.id as string;
  }

  it('cancels a booking and returns 200', async () => {
    const app = createApp();
    const id = await createOne(app);

    const res = await request(app).post(`/api/bookings/${id}/cancel`).send({ customerName: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
  });

  it('is idempotent — cancelling twice still returns 200 without error', async () => {
    const app = createApp();
    const id = await createOne(app);
    await request(app).post(`/api/bookings/${id}/cancel`).send({ customerName: 'Alice' });

    const res = await request(app).post(`/api/bookings/${id}/cancel`).send({ customerName: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
  });

  it('returns 404 for a booking that does not exist', async () => {
    const app = createApp();
    const res = await request(app).post('/api/bookings/booking-999/cancel').send({ customerName: 'Alice' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for a missing customerName', async () => {
    const app = createApp();
    const id = await createOne(app);

    const res = await request(app).post(`/api/bookings/${id}/cancel`).send({});

    expect(res.status).toBe(400);
  });
});
