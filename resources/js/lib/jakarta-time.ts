const TIMEZONE = 'Asia/Jakarta';
// Jakarta has no daylight saving, so the offset is a constant.
const JAKARTA_OFFSET = '+07:00';

const inputParts = new Intl.DateTimeFormat('en-CA', {
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

/** Value for <input type="datetime-local"> showing the instant in Jakarta time. */
export function toDateTimeInput(date: Date): string {
    const parts = Object.fromEntries(
        inputParts.formatToParts(date).map((part) => [part.type, part.value]),
    );

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function nowAsDateTimeInput(): string {
    return toDateTimeInput(new Date());
}

/** Interprets a datetime-local value as Jakarta time, never the device's own zone. */
export function dateTimeInputToIso(input: string): string {
    return `${input}:00${JAKARTA_OFFSET}`;
}

export function isoToDateTimeInput(iso: string): string {
    return toDateTimeInput(new Date(iso));
}

export function formatDateTime(iso: string): string {
    return `${displayFormat.format(new Date(iso))} WIB`;
}
