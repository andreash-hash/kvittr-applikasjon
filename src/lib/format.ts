// Norwegian formatting utilities

export const formatDate = (date: string): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('no-NO')} kr`;
};

export const getDaysUntil = (date: string): number => {
  const today = new Date();
  const target = new Date(date);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatDaysRemaining = (days: number): string => {
  if (days === 0) return 'Utløper i dag';
  if (days === 1) return '1 dag igjen';
  if (days < 0) return 'Utløpt';
  return `${days} dager igjen`;
};
