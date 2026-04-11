const CENTS_PER_EURO = 100;

export function formatEuroFromCents(cents: number): string {
  const normalizedCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  const isNegative = normalizedCents < 0;
  const absoluteCents = Math.abs(normalizedCents);
  const euros = Math.floor(absoluteCents / CENTS_PER_EURO);
  const centsPart = String(absoluteCents % CENTS_PER_EURO).padStart(2, "0");
  const eurosPart = new Intl.NumberFormat("fr-FR").format(euros);
  const formatted = `${eurosPart},${centsPart} EUR`;
  return isNegative ? `-${formatted}` : formatted;
}