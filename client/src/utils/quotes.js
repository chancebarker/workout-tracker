// A small rotating set of quotes themed around goals, habits, discipline, and consistency.
// Stable for the whole day (indexed by day-of-year), not random per page load.
const QUOTES = [
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'The successful warrior is the average man, with laser-like focus.', author: 'Bruce Lee' },
  { text: 'Small daily improvements are the key to staggering long-term results.' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: "You don't have to be great to start, but you have to start to be great.", author: 'Zig Ziglar' },
  { text: 'Motivation gets you going, but discipline keeps you growing.', author: 'John C. Maxwell' },
  { text: 'The pain of discipline weighs ounces; the pain of regret weighs tons.' },
  { text: 'Consistency is what transforms average into excellence.' },
  { text: 'You will never always be motivated, so you must learn to be disciplined.', author: 'Craig Groeschel' },
  { text: 'Habits are the compound interest of self-improvement.', author: 'James Clear' },
  { text: 'Every action you take is a vote for the type of person you wish to become.', author: 'James Clear' },
  { text: 'The plan is nothing; planning is everything.', author: 'Dwight D. Eisenhower' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'Confidence comes not from always being right but from not fearing to be wrong.' },
  { text: 'What you do today can improve all your tomorrows.' },
  { text: 'The body achieves what the mind believes.' },
  { text: 'Progress, not perfection.' },
  { text: 'Trust the process. Show up. Repeat.' },
  { text: "The only bad workout is the one that didn't happen." },
  { text: "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't.", author: 'Rikki Rogers' },
  { text: "Hard work beats talent when talent doesn't work hard.", author: 'Tim Notke' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: "Don't count the days, make the days count.", author: 'Muhammad Ali' },
]

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function quoteOfTheDay(date = new Date()) {
  return QUOTES[dayOfYear(date) % QUOTES.length]
}
