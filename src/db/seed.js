import db from './database.js'

const exercises = [
  { name: 'Bench press', equipment: 'barbell', primaryMuscle: 'Chest', isCompound: true, secondaryMuscles: 'Triceps,Shoulders',
    description: 'A horizontal pressing movement that builds the chest, front shoulders, and triceps.',
    cues: 'Retract your shoulder blades and keep them pinned to the bench\nPlant your feet firmly and drive through the floor\nLower the bar to your mid-chest with control\nPress up and slightly back toward your face' },
  { name: 'Incline bench press', equipment: 'barbell', primaryMuscle: 'Chest', isCompound: true, secondaryMuscles: 'Shoulders,Triceps',
    description: 'A pressing movement performed on an inclined bench that shifts emphasis to the upper chest.',
    cues: 'Set the bench to a 30-45 degree incline\nKeep your wrists stacked over your elbows\nLower the bar to your upper chest\nDrive the bar up and slightly back' },
  { name: 'Close-grip bench press', equipment: 'barbell', primaryMuscle: 'Triceps', isCompound: true, secondaryMuscles: 'Chest,Shoulders',
    description: 'A bench press variation with a narrower grip that shifts the load onto the triceps.',
    cues: 'Grip the bar just inside shoulder width\nKeep your elbows tucked close to your torso\nLower the bar to your lower chest\nPress up by extending through the elbows' },
  { name: 'Overhead press', equipment: 'barbell', primaryMuscle: 'Shoulders', isCompound: true, secondaryMuscles: 'Triceps,Core',
    description: 'A standing press that builds shoulder strength and overhead stability.',
    cues: 'Brace your core and squeeze your glutes\nPress the bar straight up, moving your head back slightly to clear it\nLock out fully overhead with the bar over your mid-foot\nLower under control to the front of your shoulders' },
  { name: 'Barbell row', equipment: 'barbell', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Biceps,Traps',
    description: 'A horizontal pulling movement that builds back thickness.',
    cues: "Hinge at the hips with a flat back\nPull the bar toward your lower ribcage\nSqueeze your shoulder blades together at the top\nLower with control, don't let momentum swing the bar" },
  { name: 'Deadlift', equipment: 'barbell', primaryMuscle: 'Hamstrings', isCompound: true, secondaryMuscles: 'Glutes,Back,Traps,Quads,Core',
    description: 'A hip-hinge movement that builds total-body pulling strength, especially the posterior chain.',
    cues: "Keep the bar close to your shins throughout\nBrace your core before you break the floor\nDrive through your heels and extend your hips and knees together\nKeep your back flat, don't round through the lower back" },
  { name: 'Romanian deadlift', equipment: 'barbell', primaryMuscle: 'Hamstrings', isCompound: true, secondaryMuscles: 'Glutes,Back',
    description: 'A hip-hinge variation performed from a standing start that emphasizes the hamstrings and glutes with a stretch under load.',
    cues: 'Start with a slight bend in the knees and keep it fixed\nPush your hips back while keeping the bar close to your legs\nLower until you feel a deep hamstring stretch\nDrive your hips forward to stand tall' },
  { name: 'Rack pull', equipment: 'barbell', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Hamstrings,Glutes,Traps',
    description: 'A partial deadlift started from an elevated position that overloads the top-end pull and upper back.',
    cues: 'Set the bar at or above knee height\nKeep your chest up and lats engaged\nDrive through the floor and finish by squeezing your glutes\nControl the bar back down to the pins' },
  { name: 'Barbell curl', equipment: 'barbell', primaryMuscle: 'Biceps', isCompound: false, secondaryMuscles: 'Forearms',
    description: 'A standing curl that isolates the biceps.',
    cues: 'Keep your elbows pinned to your sides\nCurl the bar up without swinging your torso\nSqueeze at the top\nLower slowly under control' },
  { name: 'Reverse curl', equipment: 'barbell', primaryMuscle: 'Forearms', isCompound: false, secondaryMuscles: 'Biceps',
    description: 'A curl performed with an overhand grip that emphasizes the forearms and brachialis.',
    cues: 'Use an overhand (pronated) grip\nKeep elbows tucked at your sides\nCurl without letting your wrists break\nLower slowly to fully extend' },
  { name: 'Shrug', equipment: 'barbell', primaryMuscle: 'Traps', isCompound: false, secondaryMuscles: 'Forearms',
    description: 'A simple isolation movement for the upper trapezius.',
    cues: 'Let the bar hang at arm\'s length\nElevate your shoulders straight up toward your ears\nAvoid rolling your shoulders — straight up and down\nPause briefly at the top and lower under control' },
  { name: 'Back squat', equipment: 'barbell', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings,Core',
    description: 'A foundational lower-body compound lift that builds the quads, glutes, and core.',
    cues: 'Set the bar on your upper traps, not your neck\nBrace your core before descending\nSit back and down, keeping your chest up\nDrive through your whole foot to stand' },
  { name: 'Front squat', equipment: 'barbell', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Core',
    description: 'A squat variation with the bar racked on the front shoulders that emphasizes the quads and upright posture.',
    cues: 'Keep your elbows high throughout\nBrace hard before descending\nKeep your torso as upright as possible\nDrive up while keeping your chest tall' },
  { name: 'Good morning', equipment: 'barbell', primaryMuscle: 'Hamstrings', isCompound: true, secondaryMuscles: 'Glutes,Back',
    description: 'A hip-hinge movement with the bar on the back that targets the hamstrings and lower back.',
    cues: 'Keep a soft bend in the knees\nHinge at the hips, pushing them back\nKeep your back flat throughout\nReturn to standing by driving your hips forward' },
  { name: 'Barbell lunge', equipment: 'barbell', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'A single-leg movement with the bar on the back that builds unilateral leg strength.',
    cues: 'Take a controlled step forward\nLower until both knees reach about 90 degrees\nKeep your torso upright\nPush through your front heel to return to standing' },
  { name: 'Hip thrust', equipment: 'barbell', primaryMuscle: 'Glutes', isCompound: false, secondaryMuscles: 'Hamstrings,Core',
    description: 'A hip-extension movement with the upper back supported that heavily targets the glutes.',
    cues: 'Rest your upper back on a bench, bar over your hips\nDrive through your heels and squeeze your glutes hard at the top\nKeep your chin tucked, avoid overextending your lower back\nLower with control' },
  { name: 'Calf raise', equipment: 'barbell', primaryMuscle: 'Calves', isCompound: false, secondaryMuscles: null,
    description: 'A standing raise that targets the calves.',
    cues: "Rise onto the balls of your feet as high as possible\nPause briefly at the top\nLower until you feel a stretch\nKeep the movement controlled, don't bounce" },
  { name: 'Ab rollout', equipment: 'barbell', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: 'Shoulders,Back',
    description: 'A core stability movement using a barbell or ab wheel that challenges anti-extension strength.',
    cues: 'Start on your knees, core braced\nRoll forward keeping your back flat, not arched\nGo only as far as you can control\nPull back in by contracting your abs, not your hip flexors' },
  { name: 'Landmine press', equipment: 'barbell', primaryMuscle: 'Shoulders', isCompound: true, secondaryMuscles: 'Triceps,Chest,Core',
    description: "A pressing movement using a landmine setup that's easier on the shoulders than a straight overhead press.",
    cues: 'Hold the bar at shoulder height\nPress up and slightly forward along its natural arc\nBrace your core throughout\nControl the bar back down' },
  { name: 'Landmine row', equipment: 'barbell', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Biceps,Traps',
    description: 'A rowing movement using a landmine setup that builds back thickness with less lower-back stress.',
    cues: 'Hinge forward with a flat back\nPull the bar to your torso, leading with your elbow\nSqueeze your shoulder blade at the top\nLower under control' },
  { name: 'Pendlay row', equipment: 'barbell', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Biceps,Traps',
    description: 'A strict row performed from a dead stop on the floor each rep, emphasizing explosive back strength.',
    cues: 'Set up with a flat back parallel to the floor\nPull explosively to your lower chest\nLet the bar return fully to the floor each rep\nAvoid using momentum from your hips' },

  { name: 'Dumbbell bench press', equipment: 'dumbbells', primaryMuscle: 'Chest', isCompound: true, secondaryMuscles: 'Triceps,Shoulders',
    description: 'A pressing movement with dumbbells that allows a greater range of motion than a barbell.',
    cues: 'Keep your wrists stacked over your elbows\nLower the dumbbells to chest level with control\nPress up and slightly inward\nKeep your shoulder blades pinned to the bench' },
  { name: 'Incline DB press', equipment: 'dumbbells', primaryMuscle: 'Chest', isCompound: true, secondaryMuscles: 'Shoulders,Triceps',
    description: 'A dumbbell press on an incline bench that emphasizes the upper chest.',
    cues: 'Set the bench to a moderate incline\nLower the dumbbells to the sides of your upper chest\nPress up and slightly together\nAvoid flaring your elbows too wide' },
  { name: 'DB fly', equipment: 'dumbbells', primaryMuscle: 'Chest', isCompound: false, secondaryMuscles: 'Shoulders',
    description: 'An isolation movement that stretches and contracts the chest through a wide arc.',
    cues: "Keep a slight, fixed bend in your elbows\nLower the dumbbells out to the sides until you feel a stretch\nBring them back together in a hugging motion\nDon't let the weight turn it into a press" },
  { name: 'Shoulder press', equipment: 'dumbbells', primaryMuscle: 'Shoulders', isCompound: true, secondaryMuscles: 'Triceps,Core',
    description: 'A standing or seated dumbbell press that builds shoulder size and pressing strength.',
    cues: 'Start with the dumbbells at shoulder height\nPress straight overhead without arching your lower back\nBring the dumbbells close together at the top\nLower under control' },
  { name: 'Lateral raise', equipment: 'dumbbells', primaryMuscle: 'Shoulders', isCompound: false, secondaryMuscles: 'Traps',
    description: 'An isolation movement for the side deltoids.',
    cues: "Use a light weight and strict form\nRaise your arms out to the sides to shoulder height\nLead with your elbows, not your hands\nLower slowly, don't swing" },
  { name: 'Front raise', equipment: 'dumbbells', primaryMuscle: 'Shoulders', isCompound: false, secondaryMuscles: 'Chest',
    description: 'An isolation movement for the front deltoids.',
    cues: 'Raise one or both dumbbells straight in front of you to shoulder height\nKeep a slight bend in the elbows\nAvoid swinging your torso for momentum\nLower with control' },
  { name: 'Overhead tricep extension', equipment: 'dumbbells', primaryMuscle: 'Triceps', isCompound: false, secondaryMuscles: 'Shoulders',
    description: 'An isolation movement that stretches and works the long head of the triceps.',
    cues: 'Keep your elbows pointed forward and close to your head\nLower the weight behind your head under control\nExtend fully at the top without flaring your elbows\nKeep your core braced to protect your lower back' },
  { name: 'Tricep kickback', equipment: 'dumbbells', primaryMuscle: 'Triceps', isCompound: false, secondaryMuscles: 'Shoulders',
    description: 'An isolation movement performed in a bent-over position that targets the triceps.',
    cues: 'Hinge forward with a flat back, upper arm parallel to the floor\nExtend your forearm straight back\nSqueeze at full extension\nAvoid swinging your upper arm' },
  { name: 'DB row', equipment: 'dumbbells', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Biceps,Traps',
    description: 'A single-arm rowing movement that builds back thickness and allows a deep stretch.',
    cues: 'Support yourself with one hand and knee on a bench\nPull the dumbbell to your hip, leading with your elbow\nSqueeze your shoulder blade at the top\nLower fully to stretch your lat' },
  { name: 'Renegade row', equipment: 'dumbbells', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Biceps,Core,Traps',
    description: 'A rowing movement performed from a plank position that combines back work with core stability.',
    cues: 'Keep your hips square and core braced throughout\nRow one dumbbell to your hip without rotating\nAvoid letting your hips sag or twist\nAlternate sides with control' },
  { name: 'DB rear delt fly', equipment: 'dumbbells', primaryMuscle: 'Shoulders', isCompound: false, secondaryMuscles: 'Traps,Back',
    description: 'An isolation movement for the rear deltoids and upper back.',
    cues: 'Hinge forward with a flat back\nRaise the dumbbells out to the sides, leading with your elbows\nSqueeze your shoulder blades together at the top\nLower slowly, avoid using momentum' },
  { name: 'DB curl', equipment: 'dumbbells', primaryMuscle: 'Biceps', isCompound: false, secondaryMuscles: 'Forearms',
    description: 'A standard dumbbell curl for building the biceps.',
    cues: 'Keep your elbows at your sides\nCurl without swinging your body\nSqueeze at the top\nLower slowly under control' },
  { name: 'Hammer curl', equipment: 'dumbbells', primaryMuscle: 'Biceps', isCompound: false, secondaryMuscles: 'Forearms',
    description: 'A curl performed with a neutral grip that emphasizes the brachialis and forearms.',
    cues: 'Keep your palms facing each other throughout\nCurl straight up without rotating your wrists\nKeep your elbows pinned to your sides\nLower with control' },
  { name: 'Concentration curl', equipment: 'dumbbells', primaryMuscle: 'Biceps', isCompound: false, secondaryMuscles: 'Forearms',
    description: 'A seated, braced curl that isolates the biceps with strict form.',
    cues: 'Brace your elbow against your inner thigh\nCurl with no body English\nSqueeze hard at the top\nLower slowly to a full stretch' },
  { name: 'DB Romanian deadlift', equipment: 'dumbbells', primaryMuscle: 'Hamstrings', isCompound: true, secondaryMuscles: 'Glutes,Back',
    description: 'A dumbbell hip-hinge that targets the hamstrings and glutes.',
    cues: 'Keep a slight, fixed bend in your knees\nPush your hips back, keeping the dumbbells close to your legs\nLower until you feel a hamstring stretch\nDrive your hips forward to return to standing' },
  { name: 'Goblet squat', equipment: 'dumbbells', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Core',
    description: 'A squat holding a single dumbbell at chest height, great for reinforcing upright squat posture.',
    cues: 'Hold the dumbbell close to your chest\nSit back and down between your knees\nKeep your chest up and elbows inside your knees\nDrive through your feet to stand' },
  { name: 'DB lunge', equipment: 'dumbbells', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'A dumbbell-loaded lunge for unilateral leg strength.',
    cues: 'Take a controlled step forward or backward\nLower until both knees are near 90 degrees\nKeep your torso upright\nPush through your front heel to return' },
  { name: 'Bulgarian split squat', equipment: 'dumbbells', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'A rear-foot-elevated single-leg squat that builds significant quad and glute strength.',
    cues: 'Rest your rear foot on a bench behind you\nLower straight down until your front thigh is near parallel\nKeep most of your weight on your front leg\nDrive through your front heel to rise' },
  { name: 'DB step-up', equipment: 'dumbbells', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'A single-leg movement stepping onto an elevated surface, building leg strength and stability.',
    cues: 'Place your whole foot on the box\nDrive through that heel to stand up\nAvoid pushing off your trailing leg\nStep down with control' },
  { name: 'DB calf raise', equipment: 'dumbbells', primaryMuscle: 'Calves', isCompound: false, secondaryMuscles: null,
    description: 'A dumbbell-loaded calf raise for added resistance.',
    cues: 'Rise onto the balls of your feet as high as possible\nPause at the top\nLower until you feel a stretch\nKeep it controlled, don\'t bounce' },
  { name: 'DB sumo squat', equipment: 'dumbbells', primaryMuscle: 'Glutes', isCompound: true, secondaryMuscles: 'Quads,Hamstrings',
    description: 'A wide-stance squat holding a dumbbell that emphasizes the glutes and inner thighs.',
    cues: 'Take a wide stance with toes pointed out\nHold the dumbbell with both hands between your legs\nSit straight down, keeping your chest tall\nDrive your knees out as you stand' },
  { name: 'DB farmer carry', equipment: 'dumbbells', primaryMuscle: 'Traps', isCompound: true, secondaryMuscles: 'Forearms,Core',
    description: 'A loaded carry that builds grip, traps, and total-body stability.',
    cues: "Stand tall with your shoulders back\nKeep your core braced throughout\nTake controlled steps, don't let the weights swing\nAvoid leaning to either side" },
  { name: 'Russian twist', equipment: 'dumbbells', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: null,
    description: 'A rotational core movement performed seated.',
    cues: 'Lean back slightly and keep your chest up\nRotate side to side under control\nKeep the movement coming from your torso, not just your arms\nAvoid rounding your lower back' },
  { name: 'DB side bend', equipment: 'dumbbells', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: null,
    description: 'An isolation movement for the obliques.',
    cues: 'Hold a single dumbbell at your side\nBend directly sideways, keeping your torso facing forward\nFeel the stretch and contraction in your obliques\nAvoid leaning forward or backward' },

  { name: 'Push-up', equipment: 'bodyweight', primaryMuscle: 'Chest', isCompound: true, secondaryMuscles: 'Triceps,Shoulders,Core',
    description: 'A foundational bodyweight pressing movement for the chest, shoulders, and triceps.',
    cues: 'Keep your body in a straight line from head to heels\nLower until your chest nearly touches the floor\nKeep your elbows at roughly a 45-degree angle\nPress back up without letting your hips sag' },
  { name: 'Wide push-up', equipment: 'bodyweight', primaryMuscle: 'Chest', isCompound: true, secondaryMuscles: 'Shoulders,Triceps',
    description: 'A push-up variation with a wider hand placement that emphasizes the chest.',
    cues: 'Place your hands wider than shoulder width\nKeep your body in a straight line\nLower with control\nPress back up, squeezing your chest' },
  { name: 'Diamond push-up', equipment: 'bodyweight', primaryMuscle: 'Triceps', isCompound: true, secondaryMuscles: 'Chest,Shoulders',
    description: 'A push-up variation with hands close together that shifts emphasis to the triceps.',
    cues: 'Form a diamond shape with your thumbs and index fingers\nKeep your elbows tucked close to your body\nLower your chest to your hands\nPress back up fully' },
  { name: 'Pike push-up', equipment: 'bodyweight', primaryMuscle: 'Shoulders', isCompound: true, secondaryMuscles: 'Triceps,Core',
    description: 'A push-up variation performed in a pike position that targets the shoulders.',
    cues: 'Start in a pike position, hips high\nLower the top of your head toward the floor\nKeep your elbows tracking back, not flared\nPress back up to the start' },
  { name: 'Dip', equipment: 'bodyweight', primaryMuscle: 'Triceps', isCompound: true, secondaryMuscles: 'Chest,Shoulders',
    description: 'A bodyweight pressing movement on parallel bars or a bench that builds the triceps and chest.',
    cues: 'Keep your torso upright to emphasize triceps\nLower until your upper arms are roughly parallel to the floor\nKeep your elbows tracking back, not flared\nPress back up to full extension' },
  { name: 'Pull-up', equipment: 'bodyweight', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Biceps,Forearms',
    description: 'A vertical pulling movement using an overhand grip that builds the back and biceps.',
    cues: 'Start from a dead hang\nPull your chest toward the bar, leading with your elbows\nAvoid excessive kipping or swinging\nLower under control to a full hang' },
  { name: 'Chin-up', equipment: 'bodyweight', primaryMuscle: 'Biceps', isCompound: true, secondaryMuscles: 'Back,Forearms',
    description: 'A pull-up variation with an underhand grip that emphasizes the biceps.',
    cues: 'Start from a dead hang with palms facing you\nPull your chin over the bar\nKeep your elbows close to your torso\nLower under control' },
  { name: 'Inverted row', equipment: 'bodyweight', primaryMuscle: 'Back', isCompound: true, secondaryMuscles: 'Biceps,Traps',
    description: 'A horizontal pulling movement using a bar or rings, a good pull-up progression.',
    cues: 'Keep your body in a straight line\nPull your chest to the bar\nSqueeze your shoulder blades together\nLower under control' },
  { name: 'Bodyweight squat', equipment: 'bodyweight', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'A foundational squat pattern using just body weight.',
    cues: 'Sit back and down as if into a chair\nKeep your chest up and knees tracking over your toes\nGo as deep as your mobility allows with good form\nDrive through your feet to stand' },
  { name: 'Jump squat', equipment: 'bodyweight', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Calves',
    description: 'An explosive squat variation that builds power in the legs.',
    cues: 'Squat down under control\nExplode upward into a jump\nLand softly, absorbing through your knees and hips\nReset your position before the next rep' },
  { name: 'Lunge', equipment: 'bodyweight', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'A bodyweight single-leg movement for leg strength and balance.',
    cues: 'Step forward under control\nLower until both knees are near 90 degrees\nKeep your torso upright\nPush through your front heel to return' },
  { name: 'Reverse lunge', equipment: 'bodyweight', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: "A lunge variation stepping backward, which is often gentler on the knees.",
    cues: 'Step backward under control\nLower your back knee toward the floor\nKeep your front shin close to vertical\nDrive through your front heel to return to standing' },
  { name: 'Step-up', equipment: 'bodyweight', primaryMuscle: 'Quads', isCompound: true, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'A single-leg movement stepping onto an elevated surface.',
    cues: 'Place your whole foot on the box\nDrive through that heel to stand\nAvoid pushing off your trailing leg\nStep down with control' },
  { name: 'Glute bridge', equipment: 'bodyweight', primaryMuscle: 'Glutes', isCompound: false, secondaryMuscles: 'Hamstrings,Core',
    description: 'A hip-extension movement performed lying down that targets the glutes.',
    cues: 'Keep your feet flat, hip-width apart\nDrive through your heels and squeeze your glutes at the top\nAvoid overextending your lower back\nLower with control' },
  { name: 'Single-leg glute bridge', equipment: 'bodyweight', primaryMuscle: 'Glutes', isCompound: false, secondaryMuscles: 'Hamstrings,Core',
    description: 'A unilateral glute bridge that increases the challenge per side.',
    cues: 'Keep one foot planted, the other leg extended\nDrive through your planted heel\nKeep your hips level, avoid rotating\nLower with control' },
  { name: 'Wall sit', equipment: 'bodyweight', primaryMuscle: 'Quads', isCompound: false, secondaryMuscles: 'Glutes',
    description: 'An isometric hold that builds quad endurance.',
    cues: 'Keep your back flat against the wall\nThighs roughly parallel to the floor\nKeep your knees tracking over your ankles\nBreathe steadily and hold the position' },
  { name: 'Calf raise (bodyweight)', equipment: 'bodyweight', primaryMuscle: 'Calves', isCompound: false, secondaryMuscles: null,
    description: 'A bodyweight calf raise for building calf endurance and size.',
    cues: 'Rise onto the balls of your feet as high as possible\nPause briefly at the top\nLower until you feel a stretch\nKeep the movement controlled' },
  { name: 'Plank', equipment: 'bodyweight', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: 'Shoulders,Glutes',
    description: 'An isometric core hold that builds anti-extension core strength.',
    cues: 'Keep your body in a straight line from head to heels\nBrace your core and squeeze your glutes\nAvoid letting your hips sag or pike up\nBreathe steadily throughout the hold' },
  { name: 'Side plank', equipment: 'bodyweight', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: 'Shoulders',
    description: 'An isometric hold that targets the obliques.',
    cues: 'Stack your feet and support on one forearm\nLift your hips until your body forms a straight line\nKeep your hips from sagging toward the floor\nHold steady, breathing normally' },
  { name: 'Dead bug', equipment: 'bodyweight', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: null,
    description: 'A core stability movement that trains bracing while limbs move.',
    cues: 'Keep your lower back pressed into the floor throughout\nExtend opposite arm and leg slowly\nMove only as far as you can control\nReturn and switch sides' },
  { name: 'Hollow body hold', equipment: 'bodyweight', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: 'Shoulders',
    description: 'An isometric hold that builds full core bracing strength.',
    cues: 'Press your lower back into the floor\nLift your shoulders and legs slightly off the ground\nKeep your arms extended overhead or at your sides\nHold steady without letting your back arch' },
  { name: 'V-up', equipment: 'bodyweight', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: null,
    description: 'A dynamic core movement that combines an upper and lower body crunch.',
    cues: 'Keep your legs straight throughout\nReach your hands toward your toes as you lift\nControl the movement both up and down\nAvoid using momentum to swing up' },
  { name: 'Leg raise', equipment: 'bodyweight', primaryMuscle: 'Core', isCompound: false, secondaryMuscles: null,
    description: 'A lower-ab focused movement raising the legs from a lying position.',
    cues: 'Keep your lower back pressed into the floor\nRaise your legs with control, not momentum\nLower them only as far as you can control\nAvoid arching your back as you lower' },
  { name: 'Mountain climber', equipment: 'bodyweight', primaryMuscle: 'Core', isCompound: true, secondaryMuscles: 'Shoulders,Quads',
    description: 'A dynamic core movement performed from a plank position that also raises your heart rate.',
    cues: 'Keep your hips low and core braced\nDrive your knees toward your chest quickly\nAvoid letting your hips bounce up and down\nKeep your hands planted firmly' },
  { name: 'Superman hold', equipment: 'bodyweight', primaryMuscle: 'Back', isCompound: false, secondaryMuscles: 'Glutes,Hamstrings',
    description: 'An isometric extension hold that targets the lower back and glutes.',
    cues: 'Lie face down and extend your arms forward\nLift your arms, chest, and legs off the floor together\nSqueeze your glutes and lower back at the top\nHold briefly, then lower with control' },
]

export function seedDatabase() {
  const existing = db.prepare('SELECT id FROM exercises WHERE is_custom = 0 LIMIT 1').get()
  if (existing) return

  console.log('Seeding exercises...')

  const insert = db.prepare(`
    INSERT INTO exercises (name, equipment, primary_muscle, is_compound, is_custom, description, cues, secondary_muscles)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `)

  const insertAll = db.transaction((rows) => {
    for (const ex of rows) {
      insert.run(ex.name, ex.equipment, ex.primaryMuscle, ex.isCompound ? 1 : 0, ex.description, ex.cues, ex.secondaryMuscles ?? null)
    }
  })

  insertAll(exercises)

  console.log(`Seeded ${exercises.length} exercises.`)
}

// Backfills description/cues/secondary_muscles onto exercises that already existed in
// the DB before these columns were added (idempotent — only touches rows missing
// content, never custom exercises).
export function backfillExerciseContent() {
  const update = db.prepare(`
    UPDATE exercises SET description = ?, cues = ?, secondary_muscles = ?
    WHERE name = ? AND is_custom = 0 AND description IS NULL
  `)
  const updateSecondaryOnly = db.prepare(`
    UPDATE exercises SET secondary_muscles = ?
    WHERE name = ? AND is_custom = 0 AND secondary_muscles IS NULL
  `)

  const updateAll = db.transaction((rows) => {
    for (const ex of rows) {
      update.run(ex.description, ex.cues, ex.secondaryMuscles ?? null, ex.name)
      // Covers the case where description/cues were already backfilled in a previous
      // run (before secondary_muscles existed) but secondary_muscles is still null.
      updateSecondaryOnly.run(ex.secondaryMuscles ?? null, ex.name)
    }
  })

  updateAll(exercises)
}
