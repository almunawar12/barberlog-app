const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats integer rupiah as "Rp25.000" (no space, no decimals). */
export function formatCurrency(amount: number): string {
  return rupiahFormatter.format(amount).replace(/\s/g, '');
}
