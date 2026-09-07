import request from 'supertest';
import { createApp } from '../app';
import * as assistantService from '../services/assistantService';

describe('POST /api/assistant/ask', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with a relevant answer for a pricing question', async () => {
    const app = createApp();
    const res = await request(app).post('/api/assistant/ask').send({ customerName: 'Mia', question: 'How much does it cost?' });

    expect(res.status).toBe(200);
    expect(res.body.understood).toBe(true);
    expect(res.body.answer).toMatch(/pricing/i);
  });

  it('returns 200 with understood:false for a question outside the AI\'s knowledge', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/assistant/ask')
      .send({ customerName: 'Mia', question: 'What is the weather like today?' });

    expect(res.status).toBe(200);
    expect(res.body.understood).toBe(false);
  });

  it('returns 400 for a missing question', async () => {
    const app = createApp();
    const res = await request(app).post('/api/assistant/ask').send({ customerName: 'Mia' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a missing customerName', async () => {
    const app = createApp();
    const res = await request(app).post('/api/assistant/ask').send({ question: 'How much does it cost?' });

    expect(res.status).toBe(400);
  });

  it('returns 500 with a safe message when the assistant service fails unexpectedly', async () => {
    jest.spyOn(assistantService, 'answerQuestion').mockImplementation(() => {
      throw new Error('simulated assistant failure');
    });

    const app = createApp();
    const res = await request(app).post('/api/assistant/ask').send({ customerName: 'Mia', question: 'How much does it cost?' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('simulated assistant failure');
  });
});
