/** Local-time date formatting for memory display (never UTC day boundaries). */
export function localDate(ts) {
    const date = new Date(ts);
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
