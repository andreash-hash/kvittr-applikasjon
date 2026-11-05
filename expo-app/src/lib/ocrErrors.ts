// Turns whatever the OCR call threw into something the scan screen can show.
//
// supabase.functions.invoke hides the function's JSON error body inside
// error.context (a fetch Response), so the screen used to show a generic
// message whatever had gone wrong. A dead API key and a blurry photo need
// different advice, and the user can only act on it if it is accurate.

export type OcrErrorKind = 'network' | 'service' | 'unreadable' | 'auth' | 'timeout' | 'unknown';

export interface OcrFailure {
  kind: OcrErrorKind;
  /** Machine code from the Edge Function, when it sent one. */
  code?: string;
  /** Norwegian text that is safe to show the user. */
  message: string;
  /** The receipt row the function created, so retry and manual entry can reuse it. */
  receiptId: string | null;
}

export const OCR_MESSAGES: Record<OcrErrorKind, string> = {
  network: 'Ingen nett. Prøv igjen når du er tilkoblet.',
  service: 'Analysen er midlertidig utilgjengelig. Prøv igjen om litt.',
  unreadable: 'Vi klarte ikke å lese kvitteringen. Prøv med et klarere bilde.',
  auth: 'Innloggingen din er utløpt. Start appen på nytt og prøv igjen.',
  timeout: 'Analysen tok for lang tid. Prøv igjen.',
  unknown: 'Noe gikk galt under analysen. Prøv igjen.',
};

const CODE_TO_KIND: Record<string, OcrErrorKind> = {
  AUTH: 'auth',
  FORBIDDEN: 'auth',
  GEMINI_KEY: 'service',
  GEMINI_UPSTREAM: 'service',
  IMAGE_FETCH: 'service',
  PARSE: 'unreadable',
  NOT_FOUND: 'unknown',
  BAD_REQUEST: 'unknown',
  UNKNOWN: 'unknown',
};

/**
 * Functions deployed before the structured codes existed only send a free-text
 * `error`. Classify those by their text so the app is correct on both sides of
 * a deploy.
 */
function kindFromLegacyText(text: string): OcrErrorKind {
  if (/GEMINI_API_KEY not configured/i.test(text)) return 'service';
  if (/Gemini (429|5\d\d|400|401|403)/i.test(text)) return 'service';
  if (/invalid JSON|empty candidates/i.test(text)) return 'unreadable';
  return 'unknown';
}

export function failure(kind: OcrErrorKind, extra: Partial<OcrFailure> = {}): OcrFailure {
  return { kind, message: OCR_MESSAGES[kind], receiptId: null, ...extra };
}

interface ErrorBody {
  code?: unknown;
  error?: unknown;
  receipt_id?: unknown;
}

export async function parseOcrError(err: unknown): Promise<OcrFailure> {
  const e = err as {
    name?: string;
    message?: string;
    context?: { json?: () => Promise<unknown> };
  } | null;

  if (e?.name === 'AbortError') return failure('timeout');
  if (e?.name === 'FunctionsFetchError') return failure('network');
  if (e?.name === 'FunctionsRelayError') return failure('service');

  if (e?.name === 'FunctionsHttpError' && typeof e.context?.json === 'function') {
    try {
      const body = (await e.context.json()) as ErrorBody | null;
      const code = typeof body?.code === 'string' ? body.code : undefined;
      const receiptId = typeof body?.receipt_id === 'string' ? body.receipt_id : null;
      const text = typeof body?.error === 'string' ? body.error : '';
      const kind = code ? (CODE_TO_KIND[code] ?? 'unknown') : kindFromLegacyText(text);
      return failure(kind, { code, receiptId });
    } catch {
      return failure('service');
    }
  }

  // fetch() itself failing in React Native surfaces as a TypeError.
  if (e?.name === 'TypeError' && /network request failed/i.test(e.message ?? '')) {
    return failure('network');
  }

  return failure('unknown');
}
