import { fetchSuggestions } from './schedulingApi';

describe('fetchSuggestions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the suggestion on success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ slots: [{ startTime: 'a', endTime: 'b' }], rationale: 'because' }),
    } as Response);

    const result = await fetchSuggestions('field-1', 'a', 'b');

    expect(result).toEqual({ slots: [{ startTime: 'a', endTime: 'b' }], rationale: 'because' });
  });

  it('returns null rather than throwing when the response is a non-2xx error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    } as Response);

    const result = await fetchSuggestions('field-1', 'a', 'b');

    expect(result).toBeNull();
  });

  it('returns null rather than throwing when the network request itself fails ("Integration error")', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));

    const result = await fetchSuggestions('field-1', 'a', 'b');

    expect(result).toBeNull();
  });
});
