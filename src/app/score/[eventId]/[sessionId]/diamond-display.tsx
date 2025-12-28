'use client'

interface DiamondDisplayProps {
  runnerFirst: boolean
  runnerSecond: boolean
  runnerThird: boolean
  balls: number
  strikes: number
  outs: number
}

export default function DiamondDisplay({
  runnerFirst,
  runnerSecond,
  runnerThird,
  balls,
  strikes,
  outs
}: DiamondDisplayProps) {
  return (
    <div className="bg-white flex items-center justify-between p-4 border-b">
      {/* SVG Diamond */}
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        {/* Infield grass */}
        <polygon 
          points="50,15 85,50 50,85 15,50" 
          fill="#4ade80"
          stroke="#16a34a"
          strokeWidth="1"
        />
        
        {/* Second base */}
        <rect 
          x="46" y="11" width="8" height="8" 
          fill={runnerSecond ? "#fbbf24" : "white"} 
          stroke="#374151"
          strokeWidth="1"
          transform="rotate(45 50 15)"
        />
        
        {/* First base */}
        <rect 
          x="81" y="46" width="8" height="8" 
          fill={runnerFirst ? "#fbbf24" : "white"} 
          stroke="#374151"
          strokeWidth="1"
          transform="rotate(45 85 50)"
        />
        
        {/* Third base */}
        <rect 
          x="11" y="46" width="8" height="8" 
          fill={runnerThird ? "#fbbf24" : "white"} 
          stroke="#374151"
          strokeWidth="1"
          transform="rotate(45 15 50)"
        />
        
        {/* Home plate */}
        <polygon 
          points="50,78 45,85 50,90 55,85" 
          fill="white"
          stroke="#374151"
          strokeWidth="1"
        />
      </svg>

      {/* Count display */}
      <div className="space-y-2">
        {/* Balls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-4">B</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < balls 
                    ? 'bg-green-500 border-green-500' 
                    : 'bg-white border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Strikes */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-4">S</span>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < strikes 
                    ? 'bg-yellow-500 border-yellow-500' 
                    : 'bg-white border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Outs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-4">O</span>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < outs 
                    ? 'bg-red-500 border-red-500' 
                    : 'bg-white border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

