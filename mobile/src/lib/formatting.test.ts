import { formatCurrency } from '@/lib/format-currency';
import {
  formatDateTime,
  jakartaDateTimeToIso,
  jakartaToPickerDate,
  pickerDateToJakarta,
  toJakartaDateTime,
} from '@/lib/jakarta-time';

describe('formatCurrency', () => {
  it.each([
    [25000, 'Rp25.000'],
    [0, 'Rp0'],
    [999999999, 'Rp999.999.999'],
    [-15000, '-Rp15.000'],
  ])('formats %i as %s', (amount, expected) => {
    expect(formatCurrency(amount)).toBe(expected);
  });
});

describe('Jakarta time', () => {
  it('shows the Jakarta wall clock of an instant, whatever the device zone', () => {
    // 17:05 UTC on 29 Oct is 00:05 WIB on 30 Oct.
    expect(toJakartaDateTime(new Date('2026-10-29T17:05:00Z'))).toBe('2026-10-30T00:05');
  });

  it('builds the API timestamp with the +07:00 offset', () => {
    expect(jakartaDateTimeToIso('2026-10-30T00:05')).toBe('2026-10-30T00:05:00+07:00');
    expect(new Date(jakartaDateTimeToIso('2026-10-30T00:05')).toISOString()).toBe('2026-10-29T17:05:00.000Z');
  });

  it('round-trips the picker date without shifting the Jakarta wall clock', () => {
    const date = jakartaToPickerDate('2026-10-30T09:45');

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()]).toEqual([
      2026, 9, 30, 9, 45,
    ]);
    expect(pickerDateToJakarta(date)).toBe('2026-10-30T09:45');
  });

  it('keeps the chosen time when only the date changes', () => {
    expect(pickerDateToJakarta(new Date(2026, 9, 31, 3, 3), '2026-10-30T09:45')).toBe('2026-10-31T09:45');
  });

  it('formats for display in WIB', () => {
    expect(formatDateTime('2026-10-30T02:00:00+00:00')).toContain('09.00');
    expect(formatDateTime('2026-10-30T02:00:00+00:00')).toMatch(/WIB$/);
  });
});
