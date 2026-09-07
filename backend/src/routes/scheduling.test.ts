import request from 'supertest';
import { createApp } from '../app';
import { resetBookings } from '../services/bookingsService';
import * as schedulingService from '../services/schedulingService';

const validBody = {
  fieldId: 'field-1',
  preferredStartTime: '2026-09-20T10:00:00.000Z',
  preferredEndTime: '2026-09-20T11:00:00.000Z',
};

describe('POST /api/scheduling/suggestions', () => {
  beforeEach(() => {
    resetBookings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with the preferred time when it is available', async () => {
    const app = createApp();
    const res = await request(app).post('/api/scheduling/suggestions').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual([{ startTime: validBody.preferredStartTime, endTime: validBody.preferredEndTime }]);
    expect(res.body.rationale).toEqual(expect.any(String));
  });

  it('returns 200 with alternative times when the preferred window is busy', async () => {
    const app = createApp();
    await request(app)
      .post('/api/bookings')
      .send({ fieldId: 'field-1', customerName: 'Jack', startTime: validBody.preferredStartTime, endTime: validBody.preferredEndTime });

    const res = await request(app).post('/api/scheduling/suggestions').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.slots).not.toContainEqual({
      startTime: validBody.preferredStartTime,
      endTime: validBody.preferredEndTime,
    });
  });

  it('returns 400 when preferredStartTime is after preferredEndTime', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/scheduling/suggestions')
      .send({ ...validBody, preferredStartTime: validBody.preferredEndTime, preferredEndTime: validBody.preferredStartTime });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a missing required field', async () => {
    const app = createApp();
    const { fieldId, ...withoutFieldId } = validBody;
    const res = await request(app).post('/api/scheduling/suggestions').send(withoutFieldId);

    expect(res.status).toBe(400);
  });

  it('returns 500 with a safe message when the scheduling service fails unexpectedly', async () => {
    jest.spyOn(schedulingService, 'suggestBookingTimes').mockImplementation(() => {
      throw new Error('simulated integration failure');
    });

    const app = createApp();
    const res = await request(app).post('/api/scheduling/suggestions').send(validBody);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('simulated integration failure');
  });
});
