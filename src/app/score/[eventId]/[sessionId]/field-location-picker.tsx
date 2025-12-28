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

    // Convert to SVG coordinate space (viewBox is 0 0 1690 1380)
    const x = Math.round(((clientX - rect.left) / rect.width) * 1690)
    const y = Math.round(((clientY - rect.top) / rect.height) * 1380)

    setSelectedPos({ x, y })
  }

  const getPositionFromCoords = (x: number, y: number): string => {
    // Map visual coordinates to fielding positions
    // ViewBox is 1690x1380, center is around x=845, home plate at y=1262
    
    // Deep outfield (very top)
    if (y < 400) {
      if (x < 600) return 'LF'
      if (x > 1090) return 'RF'
      return 'CF'
    }
    
    // Outfield
    if (y < 600) {
      if (x < 500) return 'LF'
      if (x > 1190) return 'RF'
      return 'CF'
    }
    
    // Shallow outfield
    if (y < 750) {
      if (x < 450) return 'LF'
      if (x > 1240) return 'RF'
      if (x < 650) return 'SS'
      if (x > 1040) return '2B'
      return 'CF'
    }
    
    // Infield
    if (y < 1000) {
      if (x < 550) return '3B'
      if (x > 1140) return '1B'
      if (x < 720) return 'SS'
      if (x > 970) return '2B'
      return 'P'
    }
    
    // Near home plate
    if (y < 1150) {
      if (x < 600) return '3B'
      if (x > 1090) return '1B'
      return 'P'
    }
    
    return 'C'
  }

  const handleConfirm = () => {
    if (selectedPos) {
      const position = getPositionFromCoords(selectedPos.x, selectedPos.y)
      // Convert to 10x10 grid for storage
      const gridX = Math.floor(selectedPos.x / 169)
      const gridY = Math.floor(selectedPos.y / 138)
      onSelect(gridX, gridY, position)
      setSelectedPos(null)
    }
  }

  const handleClose = () => {
    setSelectedPos(null)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="fixed bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: '85vh', backgroundColor: '#24a062' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-white/50 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="font-semibold text-lg bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
            Set the ball trajectory
          </h2>
          <button 
            onClick={handleClose} 
            className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg text-gray-600 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Field Diagram - fills remaining space */}
        <div className="flex-1 min-h-0 px-2">
          <svg 
            ref={svgRef}
            viewBox="0 0 1690 1380" 
            className="w-full h-full cursor-pointer touch-none"
            preserveAspectRatio="xMidYMid meet"
            onClick={handleTap}
            onTouchStart={handleTap}
          >
            {/* Background - darker green */}
            <rect width="1690" height="1380" fill="#24a062"/>
            
            {/* Outfield grass - lighter green arc */}
            <path 
              d="M1582.94,516.28c-149.43-253.65-425.36-423.85-741.05-423.85S252.85,261.05,102.94,512.74l741.54,741.17,738.46-737.62Z" 
              fill="#2bb673"
            />
            
            {/* Infield dirt arc - brown horseshoe */}
            <path 
              d="M1287.32,819.53c-44.02-205.65-226.79-359.85-445.58-359.85s-398.41,151.55-444.42,354.54l447,453.38,443-448.07Z" 
              fill="#bc804d"
            />
            
            {/* Infield grass - green diamond */}
            <rect 
              x="597.82" y="669.04" 
              width="494.97" height="494.97" 
              fill="#2bb673"
              transform="translate(-400.5 866.17) rotate(-45)"
            />
            
            {/* Pitcher's mound - brown circle */}
            <circle cx="841.73" cy="915.86" r="70" fill="#bc804d"/>
            
            {/* Second base area dirt - brown circle */}
            <circle cx="841.73" cy="593.22" r="70" fill="#bc804d"/>
            
            {/* First base dirt arc */}
            <path 
              d="M1230.33,880.32c-12.18-20.63-34.63-34.46-60.32-34.46-38.66,0-70,31.34-70,70,0,25.66,13.81,48.1,34.4,60.28" 
              fill="#bc804d"
            />
            
            {/* Third base dirt arc */}
            <path 
              d="M552.58,973.9c18.62-12.58,30.86-33.88,30.86-58.05,0-38.66-31.34-70-70-70-24.07,0-45.3,12.15-57.9,30.65" 
              fill="#bc804d"
            />
            
            {/* Foul lines */}
            <line x1="842.25" y1="1266.67" x2="1623.27" y2="486.67" stroke="#fff" strokeWidth="10" strokeMiterlimit="10" fill="none"/>
            <line x1="847.75" y1="1266.67" x2="66.73" y2="486.67" stroke="#fff" strokeWidth="10" strokeMiterlimit="10" fill="none"/>
            
            {/* Home plate area - brown circle */}
            <circle cx="844.73" cy="1262.34" r="85.23" fill="#bc804d"/>
            
            {/* Home plate - white pentagon */}
            <polygon points="874.73 1282.57 844.73 1311.53 814.73 1282.57 814.73 1231.34 874.73 1231.34 874.73 1282.57" fill="#fff"/>
            
            {/* Second base - white diamond */}
            <rect x="819.27" y="578.83" width="50.91" height="50.91" fill="#fff" transform="translate(-179.88 774.3) rotate(-45)"/>
            
            {/* First base - white diamond */}
            <rect x="1129.43" y="890.4" width="50.91" height="50.91" fill="#fff" transform="translate(-309.35 1084.87) rotate(-45)"/>
            
            {/* Third base - white diamond */}
            <rect x="509.12" y="890.4" width="50.91" height="50.91" fill="#fff" transform="translate(-491.04 646.25) rotate(-45)"/>
            
            {/* Selected location marker */}
            {selectedPos && (
              <g>
                <circle 
                  cx={selectedPos.x} 
                  cy={selectedPos.y} 
                  r="40" 
                  fill="#ef4444" 
                  stroke="white"
                  strokeWidth="8"
                />
                <circle 
                  cx={selectedPos.x} 
                  cy={selectedPos.y} 
                  r="12" 
                  fill="white"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Bottom UI - fixed height to prevent field from moving */}
        <div className="px-4 pb-4 pt-2" style={{ height: '160px' }}>
          {selectedPos ? (
            <div className="space-y-3">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg text-center">
                <span className="text-gray-600">Fielded by: </span>
                <strong className="text-gray-900 text-lg">{getPositionFromCoords(selectedPos.x, selectedPos.y)}</strong>
              </div>
              <button
                onClick={handleConfirm}
                className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl 
                  hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg text-lg"
              >
                Confirm Location
              </button>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
              <p className="text-center text-gray-600">
                Tap the field where the ball was caught or fielded
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}