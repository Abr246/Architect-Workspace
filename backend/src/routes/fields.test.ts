import request from 'supertest';
import { createApp } from '../app';
import * as fieldsService from '../services/fieldsService';

describe('GET /api/fields', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with only available fields', async () => {
    const app = createApp();
    const res = await request(app).get('/api/fields');

    expect(res.status).toBe(200);
    expect(res.body.fields.length).toBeGreaterThan(0);
    expect(res.body.fields.every((field: { available: boolean }) => field.available)).toBe(true);
    expect(res.body.fields.find((field: { id: string }) => field.id === 'field-3')).toBeUndefined();
  });

  it('fails safe with a 500 and a generic message when the service throws', async () => {
    jest.spyOn(fieldsService, 'getAvailableFields').mockImplementation(() => {
      throw new Error('simulated incorrect field status');
    });

    const app = createApp();
    const res = await request(app).get('/api/fields');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    // The client must never see the internal error message or a stack trace.
    expect(JSON.stringify(res.body)).not.toContain('simulated incorrect field status');
  });
});
