import request from 'supertest';
import { createApp } from '../app';
import { createBooking, resetBookings } from '../services/bookingsService';
import { resetAnalyticsCache } from '../services/analyticsService';

// Thresholds taken directly from the acceptance-criteria wording, not
// picked arbitrarily — these tests exist to enforce that wording, not to
// just prove "the system is fast" in the abstract.
const NORMAL_LOAD_THRESHOLD_MS = 2000;
const PEAK_LOAD_THRESHOLD_MS = 5000;
const PEAK_CONCURRENT_REQUESTS = 50;

// A meaningful dataset, not an empty store — an empty in-memory array would
// make this test pass even if a real O(n^2) regression were introduced.
// Each booking gets its own hour-long slot globally, so none of the 500
// ever conflicts with another regardless of which field it lands on.
function seedBookings(count: number): void {
  const base = new Date('2026-01-01T00:00:00.000Z').getTime();
  const fieldIds = ['field-1', 'field-2'];
  for (let i = 0; i < count; i += 1) {
    const startTime = new Date(base + i * 3_600_000).toISOString();
    const endTime = new Date(base + i * 3_600_000 + 3_600_000).toISOString();
    createBooking({ fieldId: fieldIds[i % 2], customerName: `LoadTestCustomer${i}`, startTime, endTime });
  }
}

describe('response time under load (STORY-010 acceptance criteria 1 & 2)', () => {
  beforeAll(() => {
    resetBookings();
    seedBookings(500);
  });

  it('responds to a single request in under 2 seconds under normal load (criterion 1)', async () => {
    resetAnalyticsCache(); // force the expensive, uncached path — the real worst case, not the optimized one
    const app = createApp();

    const startedAt = Date.now();
    const res = await request(app).get('/api/analytics/report');
    const durationMs = Date.now() - startedAt;

    expect(res.status).toBe(200);
    expect(durationMs).toBeLessThan(NORMAL_LOAD_THRESHOLD_MS);
  });

  it(`responds to ${PEAK_CONCURRENT_REQUESTS} concurrent requests in under 5 seconds under peak load (criterion 2)`, async () => {
    const app = createApp();

    const startedAt = Date.now();
    const responses = await Promise.all(
      Array.from({ length: PEAK_CONCURRENT_REQUESTS }, () => request(app).get('/api/analytics/report')),
    );
    const durationMs = Date.now() - startedAt;

    expect(responses.every((res) => res.status === 200)).toBe(true);
    expect(durationMs).toBeLessThan(PEAK_LOAD_THRESHOLD_MS);
  });

  it('handles a realistic mix of endpoints concurrently within the peak-load threshold', async () => {
    const app = createApp();

    const startedAt = Date.now();
    const responses = await Promise.all([
      ...Array.from({ length: 20 }, () => request(app).get('/api/fields')),
      ...Array.from({ length: 20 }, () => request(app).get('/api/analytics/report')),
      ...Array.from({ length: 10 }, () =>
        request(app).post('/api/assistant/ask').send({ customerName: 'LoadTest', question: 'How much does it cost?' }),
      ),
    ]);
    const durationMs = Date.now() - startedAt;

    expect(responses.every((res) => res.status === 200)).toBe(true);
    expect(durationMs).toBeLessThan(PEAK_LOAD_THRESHOLD_MS);
  });
});
