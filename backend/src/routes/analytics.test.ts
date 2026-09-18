import request from 'supertest';
import { createApp } from '../app';
import { resetBookings } from '../services/bookingsService';
import * as analyticsService from '../services/analyticsService';

describe('GET /api/analytics/report', () => {
  beforeEach(() => {
    resetBookings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with a report covering all 7 days', async () => {
    const app = createApp();
    const res = await request(app).get('/api/analytics/report');

    expect(res.status).toBe(200);
    expect(res.body.periods).toHaveLength(7);
    expect(res.body.generatedAt).toEqual(expect.any(String));
  });

  it('returns 500 with a safe message when the analytics service fails unexpectedly ("Dashboard display error" seam)', async () => {
    jest.spyOn(analyticsService, 'generateAnalyticsReport').mockImplementation(() => {
      throw new Error('simulated analysis failure');
    });

    const app = createApp();
    const res = await request(app).get('/api/analytics/report');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('simulated analysis failure');
  });
});
