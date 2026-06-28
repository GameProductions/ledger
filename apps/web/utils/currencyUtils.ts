export function parseToCents(val: string): number {
  const isNegative = val.includes('-');
  const digits = val.replace(/\D/g, '');
  if (!digits) return 0;
  const cents = parseInt(digits, 10);
  return isNegative ? -cents : cents;
}

export function formatCentsToDecimal(cents: number): string {
  const isNegative = cents < 0;
  const absoluteCents = Math.abs(cents);
  const dollars = Math.floor(absoluteCents / 100);
  const remainingCents = absoluteCents % 100;
  const centsStr = remainingCents.toString().padStart(2, '0');
  return `${isNegative ? '-' : ''}${dollars}.${centsStr}`;
}
