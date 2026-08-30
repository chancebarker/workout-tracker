import maleImage from '../assets/muscular-system-male.jpg'
import femaleImage from '../assets/muscular-system-female.jpg'

export const DIAGRAM_IMAGES = {
  male: maleImage,
  female: femaleImage,
}

// Hotspot regions as percentages of the full image (front+back views side by side in one
// image), derived from pixel-color analysis of the actual diagram art, not eyeballed.
// [x1, y1, x2, y2] — top-left / bottom-right corners as % of image width/height.
export const MUSCLE_REGIONS = [
  // Front view
  {
    muscle: 'Shoulders',
    rects: [
      [18, 26, 22, 34], [32, 26, 36, 34], // front
      [66, 23, 72, 33], [79, 23, 85, 33], // back
    ],
  },
  { muscle: 'Biceps', rects: [[17, 32, 21, 43], [32, 32, 36, 43]] },
  { muscle: 'Chest', rects: [[20, 26, 33, 37]] },
  { muscle: 'Core', rects: [[20, 36, 33, 51]] },
  { muscle: 'Quads', rects: [[20, 51, 33, 71]] },

  // Back view
  { muscle: 'Traps', rects: [[69, 19, 81, 33]] },
  { muscle: 'Back', rects: [[70, 33, 81, 46]] },
  { muscle: 'Triceps', rects: [[65, 33, 70, 47], [80, 32, 86, 47]] },
  { muscle: 'Glutes', rects: [[69, 46, 81, 58]] },
  { muscle: 'Hamstrings', rects: [[69, 58, 81, 73]] },
  { muscle: 'Calves', rects: [[69, 73, 82, 85]] },
]
