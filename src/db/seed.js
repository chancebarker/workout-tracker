import db from './database.js'

const muscles = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Forearms'
]

const exercises = [
  // Barbell
  { name: 'Barbell Back Squat', category: 'barbell', description: 'A compound lower body movement performed with a barbell across the upper back.', instructions: 'Stand with feet shoulder-width apart. Unrack the bar, brace your core, and descend until thighs are parallel to the floor. Drive through your heels to return to standing.', muscles: [{ name: 'Quadriceps', primary: true }, { name: 'Glutes', primary: true }, { name: 'Hamstrings', primary: false }, { name: 'Core', primary: false }] },
  { name: 'Barbell Deadlift', category: 'barbell', description: 'A foundational compound pull movement targeting the entire posterior chain.', instructions: 'Stand with feet hip-width apart, bar over mid-foot. Hinge at the hips, grip the bar, brace your core, and drive through the floor to stand tall. Lower with control.', muscles: [{ name: 'Hamstrings', primary: true }, { name: 'Glutes', primary: true }, { name: 'Back', primary: true }, { name: 'Core', primary: false }, { name: 'Forearms', primary: false }] },
  { name: 'Barbell Bench Press', category: 'barbell', description: 'A compound upper body push movement performed lying on a bench.', instructions: 'Lie flat on the bench, grip the bar slightly wider than shoulder-width. Unrack, lower the bar to your chest with control, then press back to full arm extension.', muscles: [{ name: 'Chest', primary: true }, { name: 'Triceps', primary: false }, { name: 'Shoulders', primary: false }] },
  { name: 'Barbell Overhead Press', category: 'barbell', description: 'A standing overhead press targeting the shoulders and upper body.', instructions: 'Stand with feet shoulder-width apart, bar at shoulder height. Brace your core and press the bar overhead to full arm extension. Lower with control.', muscles: [{ name: 'Shoulders', primary: true }, { name: 'Triceps', primary: false }, { name: 'Core', primary: false }] },
  { name: 'Barbell Row', category: 'barbell', description: 'A horizontal pulling movement targeting the back.', instructions: 'Hinge forward at the hips with a flat back, grip the bar shoulder-width. Pull the bar toward your lower chest, squeezing your shoulder blades together. Lower with control.', muscles: [{ name: 'Back', primary: true }, { name: 'Biceps', primary: false }, { name: 'Forearms', primary: false }] },

  // Dumbbell
  { name: 'Dumbbell Lunges', category: 'dumbbell', description: 'A unilateral lower body movement performed with dumbbells.', instructions: 'Hold a dumbbell in each hand at your sides. Step forward and lower your back knee toward the floor. Push through your front heel to return to standing. Alternate legs.', muscles: [{ name: 'Quadriceps', primary: true }, { name: 'Glutes', primary: true }, { name: 'Hamstrings', primary: false }] },
  { name: 'Dumbbell Shoulder Press', category: 'dumbbell', description: 'A seated or standing overhead press with dumbbells.', instructions: 'Hold dumbbells at shoulder height with palms facing forward. Press overhead to full extension. Lower with control back to shoulder height.', muscles: [{ name: 'Shoulders', primary: true }, { name: 'Triceps', primary: false }] },
  { name: 'Dumbbell Romanian Deadlift', category: 'dumbbell', description: 'A hip hinge movement targeting the hamstrings and glutes.', instructions: 'Hold dumbbells in front of your thighs. Hinge at the hips, pushing them back while lowering the dumbbells along your legs. Feel the stretch in your hamstrings and return to standing.', muscles: [{ name: 'Hamstrings', primary: true }, { name: 'Glutes', primary: true }, { name: 'Back', primary: false }] },
  { name: 'Dumbbell Bicep Curl', category: 'dumbbell', description: 'An isolation movement for the biceps.', instructions: 'Stand holding dumbbells at your sides with palms facing forward. Curl the weights toward your shoulders without swinging. Lower with control.', muscles: [{ name: 'Biceps', primary: true }, { name: 'Forearms', primary: false }] },
  { name: 'Dumbbell Tricep Overhead Extension', category: 'dumbbell', description: 'An isolation movement for the triceps.', instructions: 'Hold one dumbbell with both hands overhead. Lower it behind your head by bending your elbows. Press back to full extension.', muscles: [{ name: 'Triceps', primary: true }] },

  // Bodyweight
  { name: 'Bodyweight Squat', category: 'bodyweight', description: 'A foundational lower body movement using only bodyweight.', instructions: 'Stand with feet shoulder-width apart. Lower until thighs are parallel to the floor, keeping chest up and knees tracking over toes. Drive through your heels to stand.', muscles: [{ name: 'Quadriceps', primary: true }, { name: 'Glutes', primary: true }, { name: 'Hamstrings', primary: false }] },
  { name: 'Push Up', category: 'bodyweight', description: 'A fundamental upper body pushing movement.', instructions: 'Start in a high plank with hands slightly wider than shoulders. Lower your chest to the floor with elbows at 45 degrees. Push back to full arm extension.', muscles: [{ name: 'Chest', primary: true }, { name: 'Triceps', primary: false }, { name: 'Shoulders', primary: false }] },
  { name: 'Pull Up', category: 'bodyweight', description: 'An upper body pulling movement using a bar.', instructions: 'Hang from a bar with palms facing away, hands shoulder-width apart. Pull yourself up until your chin clears the bar. Lower with control to full arm extension.', muscles: [{ name: 'Back', primary: true }, { name: 'Biceps', primary: false }] },
  { name: 'Plank', category: 'bodyweight', description: 'A core stability hold.', instructions: 'Hold a forearm plank position with your body in a straight line from head to heels. Brace your core and glutes. Hold for the prescribed duration.', muscles: [{ name: 'Core', primary: true }, { name: 'Shoulders', primary: false }] },

  // Cable
  { name: 'Cable Tricep Pushdown', category: 'cable', description: 'An isolation movement for the triceps using a cable machine.', instructions: 'Stand facing the cable machine with the rope or bar attachment at head height. Push down until arms are fully extended. Control the return.', muscles: [{ name: 'Triceps', primary: true }] },
  { name: 'Cable Face Pull', category: 'cable', description: 'A rear delt and upper back movement using a cable machine.', instructions: 'Set the cable at face height with a rope attachment. Pull toward your face with elbows flared high, externally rotating at the end. Control the return.', muscles: [{ name: 'Shoulders', primary: true }, { name: 'Back', primary: false }] },
  { name: 'Cable Lat Pulldown', category: 'cable', description: 'A vertical pulling movement targeting the lats.', instructions: 'Sit at the cable station, grip the bar wider than shoulders. Pull the bar to your upper chest, squeezing your lats. Control the return to full arm extension.', muscles: [{ name: 'Back', primary: true }, { name: 'Biceps', primary: false }] },

  // Machine
  { name: 'Leg Press', category: 'machine', description: 'A lower body pushing movement performed on a plate-loaded or selectorized machine.', instructions: 'Sit in the machine with feet shoulder-width on the platform. Release the safety and lower the platform toward your chest. Press back to near full extension without locking the knees.', muscles: [{ name: 'Quadriceps', primary: true }, { name: 'Glutes', primary: false }, { name: 'Hamstrings', primary: false }] },
  { name: 'Leg Curl', category: 'machine', description: 'An isolation movement for the hamstrings performed on a machine.', instructions: 'Lie face down on the machine with the pad at your ankles. Curl your legs toward your glutes. Lower with control.', muscles: [{ name: 'Hamstrings', primary: true }] },
  { name: 'Chest Fly Machine', category: 'machine', description: 'An isolation movement for the chest using a pec deck or cable fly machine.', instructions: 'Sit with your back flat against the pad. Grip the handles and bring them together in front of your chest in a wide arc. Control the return.', muscles: [{ name: 'Chest', primary: true }, { name: 'Shoulders', primary: false }] },
]

export function seedDatabase() {
  const existingExercise = db.prepare('SELECT id FROM exercises WHERE is_seeded = 1').get()
  if (existingExercise) return

  console.log('Seeding database...')

  const insertMuscle = db.prepare('INSERT OR IGNORE INTO muscles (name) VALUES (?)')
  for (const muscle of muscles) {
    insertMuscle.run(muscle)
  }

  const insertExercise = db.prepare(`
    INSERT OR IGNORE INTO exercises (name, category, description, instructions, is_seeded)
    VALUES (?, ?, ?, ?, 1)
  `)

  const insertExerciseMuscle = db.prepare(`
    INSERT OR IGNORE INTO exercise_muscles (exercise_id, muscle_id, is_primary)
    VALUES (?, (SELECT id FROM muscles WHERE name = ?), ?)
  `)

  for (const exercise of exercises) {
    const { lastInsertRowid } = insertExercise.run(
      exercise.name,
      exercise.category,
      exercise.description,
      exercise.instructions
    )

    for (const muscle of exercise.muscles) {
      insertExerciseMuscle.run(lastInsertRowid, muscle.name, muscle.primary ? 1 : 0)
    }
  }

  console.log('Exercises seeded.')
  seedPrograms()
  console.log('Database seeded successfully.')
}

function seedPrograms() {
  const existing = db.prepare('SELECT id FROM program_templates LIMIT 1').get()
  if (existing) return

  // A 4-week strength block (repeatable across 12 weeks)
  const program = db.prepare(`
    INSERT INTO program_templates (name, description, goal, duration_weeks, days_per_week)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'Foundational Strength - 12 Weeks',
    'A progressive 12-week strength program built around the four main barbell lifts. Intensity increases each week with a deload every 4th week.',
    'strength',
    12,
    4
  )

  const programId = program.lastInsertRowid

  // Week structure: 4 days per week, repeated with increasing intensity
  // Day 1: Squat + Press, Day 2: Deadlift + Row, Day 3: Press + Squat variation, Day 4: Row + Deadlift variation
  const weekIntensities = [
    { week: 1,  sets: 3, reps: 5, intensity: 65 },
    { week: 2,  sets: 3, reps: 5, intensity: 72 },
    { week: 3,  sets: 3, reps: 5, intensity: 80 },
    { week: 4,  sets: 3, reps: 5, intensity: 55 }, // deload
    { week: 5,  sets: 3, reps: 3, intensity: 75 },
    { week: 6,  sets: 3, reps: 3, intensity: 82 },
    { week: 7,  sets: 3, reps: 3, intensity: 88 },
    { week: 8,  sets: 3, reps: 3, intensity: 60 }, // deload
    { week: 9,  sets: 5, reps: 1, intensity: 85 },
    { week: 10, sets: 5, reps: 1, intensity: 90 },
    { week: 11, sets: 5, reps: 1, intensity: 95 },
    { week: 12, sets: 3, reps: 3, intensity: 70 }, // deload
  ]

  const getExerciseId = (name) => db.prepare('SELECT id FROM exercises WHERE name = ?').get(name)?.id

  const insertDay = db.prepare(`
    INSERT INTO program_days (program_template_id, week_number, day_number, name)
    VALUES (?, ?, ?, ?)
  `)

  const insertExercise = db.prepare(`
    INSERT INTO program_exercises (program_day_id, exercise_id, sets, reps, intensity_percent, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const week of weekIntensities) {
    // Day 1 - Squat Day
    const day1 = insertDay.run(programId, week.week, 1, 'Squat Day')
    insertExercise.run(day1.lastInsertRowid, getExerciseId('Barbell Back Squat'), week.sets, week.reps, week.intensity, 1)
    insertExercise.run(day1.lastInsertRowid, getExerciseId('Barbell Overhead Press'), week.sets, week.reps, week.intensity, 2)
    insertExercise.run(day1.lastInsertRowid, getExerciseId('Dumbbell Romanian Deadlift'), 3, 10, 60, 3)

    // Day 2 - Deadlift Day
    const day2 = insertDay.run(programId, week.week, 2, 'Deadlift Day')
    insertExercise.run(day2.lastInsertRowid, getExerciseId('Barbell Deadlift'), week.sets, week.reps, week.intensity, 1)
    insertExercise.run(day2.lastInsertRowid, getExerciseId('Barbell Row'), week.sets, week.reps, week.intensity, 2)
    insertExercise.run(day2.lastInsertRowid, getExerciseId('Cable Lat Pulldown'), 3, 10, null, 3)

    // Day 3 - Press Day
    const day3 = insertDay.run(programId, week.week, 3, 'Press Day')
    insertExercise.run(day3.lastInsertRowid, getExerciseId('Barbell Bench Press'), week.sets, week.reps, week.intensity, 1)
    insertExercise.run(day3.lastInsertRowid, getExerciseId('Barbell Back Squat'), week.sets, week.reps, Math.round(week.intensity * 0.85), 2)
    insertExercise.run(day3.lastInsertRowid, getExerciseId('Cable Tricep Pushdown'), 3, 12, null, 3)

    // Day 4 - Row Day
    const day4 = insertDay.run(programId, week.week, 4, 'Row Day')
    insertExercise.run(day4.lastInsertRowid, getExerciseId('Barbell Row'), week.sets, week.reps, week.intensity, 1)
    insertExercise.run(day4.lastInsertRowid, getExerciseId('Barbell Deadlift'), week.sets, week.reps, Math.round(week.intensity * 0.85), 2)
    insertExercise.run(day4.lastInsertRowid, getExerciseId('Cable Face Pull'), 3, 15, null, 3)
  }

  console.log('Programs seeded.')
}
