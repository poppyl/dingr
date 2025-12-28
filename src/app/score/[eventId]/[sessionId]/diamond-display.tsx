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
    <div className="bg-white flex items-center justify-between px-4 py-3 border-b">
      {/* Diamond visualization - exact layout from reference */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="101" 
        height="40" 
        viewBox="0 0 101 40" 
        fill="none"
        className="w-28"
      >
        {/* Second base (top center) */}
        <path 
          d="M72.3622 12.54L50.1542 24.5117L27.9462 12.54L50.1542 0.567383L72.3622 12.54Z" 
          fill={runnerSecond ? '#F5B335' : 'white'}
          stroke="black"
        />
        {/* Third base (bottom left) */}
        <path 
          d="M45.4697 27.4597L23.2617 39.4313L1.05371 27.4597L23.2617 15.487L45.4697 27.4597Z" 
          fill={runnerThird ? '#F5B335' : 'white'}
          stroke="black"
        />
        {/* First base (bottom right) */}
        <path 
          d="M99.1288 27.4597L76.9208 39.4313L54.7128 27.4597L76.9208 15.487L99.1288 27.4597Z" 
          fill={runnerFirst ? '#F5B335' : 'white'}
          stroke="black"
        />
      </svg>

      {/* Count indicators - right side: B, S, O */}
      <div className="flex flex-col gap-1.5">
        {/* Balls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 w-4">B</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`ball-${i}`}
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
          <span className="text-sm font-medium text-gray-600 w-4">S</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={`strike-${i}`}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < strikes 
                    ? 'bg-yellow-400 border-yellow-400' 
                    : 'bg-white border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Outs */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 w-4">O</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={`out-${i}`}
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