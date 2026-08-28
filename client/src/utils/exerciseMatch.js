// Case-insensitive exact match only. Zero or multiple matches is treated as unresolved
// (returns null) rather than guessing — a wrong auto-match would silently log sets against
// the wrong exercise, which is worse than asking the user to confirm.
export function matchExercise(parsedName, exercises) {
  const needle = parsedName.trim().toLowerCase()
  const matches = exercises.filter(ex => ex.name.trim().toLowerCase() === needle)
  return matches.length === 1 ? matches[0] : null
}
