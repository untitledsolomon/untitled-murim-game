import { CALENDAR_LABELS, DAYS_PER_MONTH, DAYS_PER_YEAR } from "@murim/sim";

/** "Third Moon 12, Year 2" from a zero-based sim day. */
export function formatDay(day: number): string {
    const safe = Math.max(0, Math.floor(day));
    const year = Math.floor(safe / DAYS_PER_YEAR) + 1;
    const inYear = safe % DAYS_PER_YEAR;
    const month = Math.floor(inYear / DAYS_PER_MONTH);
    const dayOfMonth = (inYear % DAYS_PER_MONTH) + 1;
    const label = CALENDAR_LABELS[month] ?? `${month + 1}`;
    return `${label} ${dayOfMonth}, Year ${year}`;
}

/** Copper cash, whole numbers only. */
export function formatMoney(value: number): string {
    return `${Math.round(value).toLocaleString("en-US")} cash`;
}

/** "Founded 3 years ago" from a founding day against a reference day. */
export function formatYearsAgo(foundedDay: number, today: number): string {
    const years = Math.floor(Math.max(0, today - foundedDay) / DAYS_PER_YEAR);
    if (years <= 0) return "this year";
    if (years === 1) return "1 year ago";
    return `${years} years ago`;
}
