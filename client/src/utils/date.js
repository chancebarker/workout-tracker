// Format a Date as YYYY-MM-DD in LOCAL time.
// (Date.toISOString() converts to UTC and can shift the day across timezones.)
export function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
