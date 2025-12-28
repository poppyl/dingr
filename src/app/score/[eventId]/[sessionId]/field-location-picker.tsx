'use client'

import { useState, useRef } from 'react'

interface FieldLocationPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (x: number, y: number, position: string) => void
}

export default function FieldLocationPicker({ isOpen, onClose, onSelect }: FieldLocationPickerProps) {
  const [selectedPos, setSelectedPos] = useState<{x: number, y: number} | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (!isOpen) return null

  const handleTap = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return

    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Convert to 0-100 coordinate space
    const x = Math.round(((clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((clientY - rect.top) / rect.height) * 100)

    setSelectedPos({ x, y })
  }

  const getPositionFromCoords = (x: number, y: number): string => {
    // Map visual coordinates to fielding positions
    // Y axis: 0 = top (outfield), 100 = bottom (home plate)
    // X axis: 0 = left (3B/LF), 100 = right (1B/RF)
    
    if (y < 30) {
      // Outfield
      if (x < 35) return 'LF'
      if (x > 65) return 'RF'
      return 'CF'
    }
    
    if (y < 55) {
      // Infield corners and middle
      if (x < 30) return '3B'
      if (x > 70) return '1B'
      if (x < 45) return 'SS'
      if (x > 55) return '2B'
      return 'P'
    }
    
    if (y < 75) {
      // Pitcher area
      return 'P'
    }
    
    // Catcher area
    return 'C'
  }

  const handleConfirm = () => {
    if (selectedPos) {
      const position = getPositionFromCoords(selectedPos.x, selectedPos.y)
      // Convert to 10x10 grid for storage
      const gridX = Math.floor(selectedPos.x / 10)
      const gridY = Math.floor(selectedPos.y / 10)
      onSelect(gridX, gridY, position)
      setSelectedPos(null)
    }
  }

  const handleClose = () => {
    setSelectedPos(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Where was ball fielded?</h2>
          <button onClick={handleClose} className="text-gray-500">Cancel</button>
        </div>

        {/* Field Diagram */}
        <div className="p-4">
          <svg 
            ref={svgRef}
            viewBox="0 0 100 100" 
            className="w-full aspect-square rounded-xl cursor-pointer touch-none"
            onClick={handleTap}
            onTouchStart={handleTap}
          >
            {/* Background - outfield grass */}
            <rect x="0" y="0" width="100" height="100" fill="#166534" />
            
            {/* Outfield arc */}
            <path 
              d="M 0 60 Q 50 -20 100 60" 
              fill="#15803d" 
              stroke="#14532d"
              strokeWidth="0.5"
            />
            
            {/* Infield dirt */}
            <polygon 
              points="50,25 75,50 50,75 25,50" 
              fill="#a16207"
            />
            
            {/* Infield grass */}
            <circle cx="50" cy="50" r="12" fill="#166534" />
            
            {/* Foul lines */}
            <line x1="50" y1="85" x2="0" y2="35" stroke="white" strokeWidth="0.5" />
            <line x1="50" y1="85" x2="100" y2="35" stroke="white" strokeWidth="0.5" />
            
            {/* Bases */}
            <rect x="48" y="23" width="4" height="4" fill="white" transform="rotate(45 50 25)" />
            <rect x="73" y="48" width="4" height="4" fill="white" transform="rotate(45 75 50)" />
            <rect x="23" y="48" width="4" height="4" fill="white" transform="rotate(45 25 50)" />
            
            {/* Home plate */}
            <polygon points="50,81 46,85 50,89 54,85" fill="white" />
            
            {/* Pitcher's mound */}
            <circle cx="50" cy="55" r="3" fill="#a16207" stroke="#854d0e" strokeWidth="0.5" />
            
            {/* Position labels */}
            <text x="50" y="12" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">CF</text>
            <text x="15" y="25" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">LF</text>
            <text x="85" y="25" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">RF</text>
            <text x="28" y="48" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">3B</text>
            <text x="72" y="48" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">1B</text>
            <text x="38" y="38" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">SS</text>
            <text x="62" y="38" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">2B</text>
            <text x="50" y="58" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">P</text>
            
            {/* Selected location marker */}
            {selectedPos && (
              <g>
                <circle 
                  cx={selectedPos.x} 
                  cy={selectedPos.y} 
                  r="4" 
                  fill="#ef4444" 
                  stroke="white"
                  strokeWidth="1.5"
                />
                <circle 
                  cx={selectedPos.x} 
                  cy={selectedPos.y} 
                  r="1.5" 
                  fill="white"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          {selectedPos ? (
            <div className="space-y-3">
              <p className="text-center text-gray-600">
                Fielded by: <strong className="text-gray-900">
                  {getPositionFromCoords(selectedPos.x, selectedPos.y)}
                </strong>
              </p>
              <button
                onClick={handleConfirm}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl 
                  hover:bg-blue-700 active:bg-blue-800"
              >
                Confirm Location
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Tap the field where the ball was caught or fielded
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
