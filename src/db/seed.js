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

  console.log('Database seeded successfully.')
}
