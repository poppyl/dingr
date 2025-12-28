'use client'

interface PitchButtonsProps {
  onBall: () => void
  onStrike: () => void
  onFoul: () => void
  onBallInPlay: () => void
  onHitByPitch: () => void
  disabled: boolean
  balls: number
  strikes: number
}

export default function PitchButtons({
  onBall,
  onStrike,
  onFoul,
  onBallInPlay,
  onHitByPitch,
  disabled,
  balls,
  strikes
}: PitchButtonsProps) {
  return (
    <div className="bg-white p-4 space-y-3 border-b">
      {/* Main pitch buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onBall}
          disabled={disabled}
          className="py-4 bg-green-500 text-white font-bold rounded-xl 
            hover:bg-green-600 active:bg-green-700 
            disabled:opacity-50 disabled:cursor-not-allowed
            text-lg shadow-sm"
        >
          Ball
        </button>
        <button
          onClick={onStrike}
          disabled={disabled}
          className="py-4 bg-yellow-500 text-white font-bold rounded-xl 
            hover:bg-yellow-600 active:bg-yellow-700 
            disabled:opacity-50 disabled:cursor-not-allowed
            text-lg shadow-sm"
        >
          Strike
        </button>
        <button
          onClick={onFoul}
          disabled={disabled}
          className="py-4 bg-orange-500 text-white font-bold rounded-xl 
            hover:bg-orange-600 active:bg-orange-700 
            disabled:opacity-50 disabled:cursor-not-allowed
            text-lg shadow-sm"
        >
          Foul
        </button>
      </div>
      
      {/* Ball in play - primary action */}
      <button
        onClick={onBallInPlay}
        disabled={disabled}
        className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl 
          hover:bg-blue-700 active:bg-blue-800 
          disabled:opacity-50 disabled:cursor-not-allowed
          text-lg shadow-sm"
      >
        ⚾ Ball In Play
      </button>
      
      {/* Secondary actions */}
      <button
        onClick={onHitByPitch}
        disabled={disabled}
        className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl 
          hover:bg-gray-200 active:bg-gray-300
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Hit By Pitch
      </button>
    </div>
  )
}

