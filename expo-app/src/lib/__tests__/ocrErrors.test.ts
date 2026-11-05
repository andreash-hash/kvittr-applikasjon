import { parseOcrError, OCR_MESSAGES } from '../ocrErrors';

function httpError(body: unknown) {
  return {
    name: 'FunctionsHttpError',
    context: { json: async () => body },
  };
}

describe('parseOcrError', () => {
  it('maps a network failure', async () => {
    const result = await parseOcrError({ name: 'FunctionsFetchError' });
    expect(result.kind).toBe('network');
    expect(result.message).toBe(OCR_MESSAGES.network);
  });

  it('maps an aborted call to a timeout', async () => {
    const result = await parseOcrError({ name: 'AbortError' });
    expect(result.kind).toBe('timeout');
  });

  it('maps a React Native fetch failure to a network error', async () => {
    const result = await parseOcrError({ name: 'TypeError', message: 'Network request failed' });
    expect(result.kind).toBe('network');
  });

  it('reads the structured code and receipt id from the function body', async () => {
    const result = await parseOcrError(
      httpError({ code: 'PARSE', receipt_id: 'r1', status: 'failed', error: 'x' }),
    );
    expect(result.kind).toBe('unreadable');
    expect(result.code).toBe('PARSE');
    expect(result.receiptId).toBe('r1');
  });

  it('treats a dead Gemini key as a service problem, not a bad photo', async () => {
    const result = await parseOcrError(httpError({ code: 'GEMINI_KEY', receipt_id: 'r2' }));
    expect(result.kind).toBe('service');
    expect(result.message).toBe(OCR_MESSAGES.service);
  });

  it('maps an ownership failure to the auth message', async () => {
    const result = await parseOcrError(httpError({ code: 'FORBIDDEN' }));
    expect(result.kind).toBe('auth');
  });

  it('still classifies legacy function errors that have no code', async () => {
    const quota = await parseOcrError(
      httpError({ receipt_id: 'r3', status: 'failed', error: 'Gemini 429: quota exceeded' }),
    );
    expect(quota.kind).toBe('service');
    expect(quota.receiptId).toBe('r3');

    const garbled = await parseOcrError(
      httpError({ error: 'Gemini returned invalid JSON: {oops' }),
    );
    expect(garbled.kind).toBe('unreadable');
  });

  it('falls back to unknown for anything else', async () => {
    const result = await parseOcrError(new Error('boom'));
    expect(result.kind).toBe('unknown');
    expect(result.receiptId).toBeNull();
  });
});
