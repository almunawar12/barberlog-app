const TIMEZONE = 'Asia/Jakarta';
// Jakarta has no daylight saving, so the offset is a constant.
const JAKARTA_OFFSET = '+07:00';

const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const displayFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormat = new Intl.DateTimeFormat('id-ID', { timeZone: TIMEZONE, dateStyle: 'medium' });

function jakartaParts(date: Date) {
  return Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
}

/** "YYYY-MM-DDTHH:mm": the instant's wall clock in Jakarta. */
export function toJakartaDateTime(date: Date): string {
  const p = jakartaParts(date);

  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** "YYYY-MM-DD" in Jakarta. */
export function toJakartaDate(date: Date): string {
  return toJakartaDateTime(date).slice(0, 10);
}

export function nowInJakarta(): string {
  return toJakartaDateTime(new Date());
}

export function todayInJakarta(): string {
  return toJakartaDate(new Date());
}

export function monthStartInJakarta(): string {
  return `${todayInJakarta().slice(0, 8)}01`;
}

/** API timestamp for a Jakarta wall-clock value, never the device's own zone. */
export function jakartaDateTimeToIso(value: string): string {
  return `${value}:00${JAKARTA_OFFSET}`;
}

export function isoToJakartaDateTime(iso: string): string {
  return toJakartaDateTime(new Date(iso));
}

/**
 * The Android picker works in the device's zone. To edit a Jakarta wall clock we hand it a
 * Date whose *local* components equal the Jakarta ones, and read local components back.
 */
export function jakartaToPickerDate(value: string): Date {
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute);
}

export function pickerDateToJakarta(date: Date, keepTimeFrom?: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = keepTimeFrom ? keepTimeFrom.split('T')[1] : `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return `${day}T${time}`;
}

export function formatDateTime(iso: string): string {
  return `${displayFormat.format(new Date(iso))} WIB`;
}

export function formatJakartaDateTimeValue(value: string): string {
  return `${displayFormat.format(new Date(jakartaDateTimeToIso(value)))} WIB`;
}

export function formatDateValue(value: string): string {
  return dateFormat.format(new Date(jakartaDateTimeToIso(`${value}T12:00`)));
}
