import request from 'supertest';
import { createApp } from '../app';

describe('requestLogger', () => {
  it('logs every field availability view with a timestamp', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const app = createApp();
    await request(app).get('/api/fields');

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);

    expect(logged.timestamp).toEqual(expect.any(String));
    expect(new Date(logged.timestamp).toString()).not.toBe('Invalid Date');
    expect(logged.outcome).toBe('success');
    expect(logged.event).toBe('get_api_fields');
    expect(logged.context.path).toBe('/api/fields');
    expect(logged.context.status).toBe(200);

    logSpy.mockRestore();
  });

  it('logs a failed view as outcome: failure', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(require('../services/fieldsService'), 'getAvailableFields').mockImplementation(() => {
      throw new Error('simulated failure');
    });

    const app = createApp();
    await request(app).get('/api/fields');

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(logged.outcome).toBe('failure');
    expect(logged.context.status).toBe(500);

    jest.restoreAllMocks();
  });
});
