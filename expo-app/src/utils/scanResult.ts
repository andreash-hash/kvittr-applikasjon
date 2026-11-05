// Decides what the result screen says right after a scan.
//
// The result screen is where a new user first sees the product's value, so the
// wording matters more than the layout: a warranty date is the payoff, and a
// receipt with no warranty still deserves a clear, specific answer.

import type { Receipt } from '../types/receipt';

export type ResultTone = 'good' | 'soon' | 'expired' | 'neutral';

export interface ScanResultSummary {
  /** Short label above the headline, for example "Garanti til". */
  label: string;
  /** The big line, usually a date. Null when there is nothing date-like to show. */
  headline: string | null;
  /** One supporting line, for example the days remaining. */
  detail: string;
  tone: ResultTone;
}

const MONTHS_NB = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

/** "14. mars 2029". Parses YYYY-MM-DD as a local date so the day never shifts. */
export function formatDateNb(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d}. ${MONTHS_NB[m - 1]} ${y}`;
}

function daysUntil(iso: string, today: Date): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function remainingText(days: number): string {
  if (days === 0) return 'Utløper i dag';
  if (days === 1) return '1 dag igjen';
  if (days < 60) return `${days} dager igjen`;
  const months = Math.round(days / 30.4);
  if (months < 24) return `Ca. ${months} måneder igjen`;
  const years = Math.floor(days / 365);
  const restMonths = Math.round((days - years * 365) / 30.4);
  return restMonths > 0 && restMonths < 12
    ? `Ca. ${years} år og ${restMonths} mnd igjen`
    : `Ca. ${years} år igjen`;
}

export function summarizeScanResult(receipt: Receipt, today: Date = new Date()): ScanResultSummary {
  if (receipt.type === 'gift_card') {
    const expiry = receipt.expiry_date;
    if (expiry) {
      const days = daysUntil(expiry, today);
      return days < 0
        ? { label: 'Gavekortet utløp', headline: formatDateNb(expiry), detail: 'Fristen er ute.', tone: 'expired' }
        : { label: 'Gavekort gyldig til', headline: formatDateNb(expiry), detail: remainingText(days), tone: days <= 30 ? 'soon' : 'good' };
    }
    return { label: 'Gavekort', headline: null, detail: 'Vi fant ingen utløpsdato på gavekortet.', tone: 'neutral' };
  }

  if (receipt.type === 'return_slip') {
    const until = receipt.return_until ?? receipt.expiry_date;
    if (until) {
      const days = daysUntil(until, today);
      return days < 0
        ? { label: 'Tilgodelappen utløp', headline: formatDateNb(until), detail: 'Fristen er ute.', tone: 'expired' }
        : { label: 'Gyldig til', headline: formatDateNb(until), detail: remainingText(days), tone: days <= 14 ? 'soon' : 'good' };
    }
    return { label: 'Tilgodelapp', headline: null, detail: 'Vi fant ingen frist på lappen.', tone: 'neutral' };
  }

  if (receipt.warranty_until) {
    const days = daysUntil(receipt.warranty_until, today);
    return days < 0
      ? { label: 'Garantien utløp', headline: formatDateNb(receipt.warranty_until), detail: 'Reklamasjonsretten er utløpt.', tone: 'expired' }
      : { label: 'Garanti til', headline: formatDateNb(receipt.warranty_until), detail: remainingText(days), tone: days <= 30 ? 'soon' : 'good' };
  }

  if (receipt.return_until) {
    const days = daysUntil(receipt.return_until, today);
    if (days >= 0) {
      return { label: 'Bytterett til', headline: formatDateNb(receipt.return_until), detail: remainingText(days), tone: days <= 7 ? 'soon' : 'good' };
    }
  }

  return {
    label: 'Ingen garanti',
    headline: null,
    detail: receipt.warranty_reasoning ?? 'Denne typen kjøp har vanligvis ingen reklamasjonsrett.',
    tone: 'neutral',
  };
}
