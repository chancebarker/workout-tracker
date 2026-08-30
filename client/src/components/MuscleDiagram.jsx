import { useState } from 'react'
import { DIAGRAM_IMAGES, MUSCLE_REGIONS } from '../utils/muscleDiagram'

export default function MuscleDiagram({ sex, selected, onSelectMuscle }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="relative inline-block w-full max-w-2xl rounded-xl overflow-hidden border border-border">
      <img src={DIAGRAM_IMAGES[sex]} alt={`${sex} muscular system diagram`} className="w-full block select-none" draggable={false} />

      {MUSCLE_REGIONS.map(({ muscle, rects }) =>
        rects.map(([x1, y1, x2, y2], i) => {
          const isActive = selected === muscle
          const isHovered = hovered === muscle
          return (
            <button
              key={`${muscle}-${i}`}
              onClick={() => onSelectMuscle(muscle)}
              onMouseEnter={() => setHovered(muscle)}
              onMouseLeave={() => setHovered(h => (h === muscle ? null : h))}
              title={muscle}
              className={[
                'absolute rounded-sm transition-colors cursor-pointer',
                isActive ? 'bg-accent/40 ring-2 ring-accent' : isHovered ? 'bg-white/25' : 'bg-transparent'
              ].join(' ')}
              style={{
                left: `${x1}%`, top: `${y1}%`,
                width: `${x2 - x1}%`, height: `${y2 - y1}%`,
              }}
            />
          )
        })
      )}

      {hovered && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-surface/90 border border-border text-white text-xs font-medium pointer-events-none">
          {hovered}
        </div>
      )}
    </div>
  )
}
