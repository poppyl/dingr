'use client'

interface Play {
  id: string
  inning: number
  is_home_team: boolean
  result: string
  rbi: number
  batter: { full_name: string } | null
  opponent_batter: { name: string } | null
}

interface PlayByPlayLogProps {
  plays: Play[]
}

const resultLabels: Record<string, string> = {
  single: '1B',
  double: '2B',
  triple: '3B',
  home_run: 'HR',
  walk: 'BB',
  strikeout_swinging: 'K',
  strikeout_looking: 'Kꓘ',
  hit_by_pitch: 'HBP',
  groundout: 'GO',
  flyout: 'FO',
  lineout: 'LO',
  popout: 'PO',
  error: 'E',
  fielders_choice: 'FC',
  double_play: 'DP',
  sacrifice_fly: 'SF',
  sacrifice_bunt: 'SAC',
}

const resultColors: Record<string, string> = {
  single: 'bg-green-100 text-green-700',
  double: 'bg-green-100 text-green-700',
  triple: 'bg-green-100 text-green-700',
  home_run: 'bg-green-200 text-green-800',
  walk: 'bg-blue-100 text-blue-700',
  hit_by_pitch: 'bg-blue-100 text-blue-700',
  strikeout_swinging: 'bg-red-100 text-red-700',
  strikeout_looking: 'bg-red-100 text-red-700',
  groundout: 'bg-gray-100 text-gray-700',
  flyout: 'bg-gray-100 text-gray-700',
  lineout: 'bg-gray-100 text-gray-700',
  popout: 'bg-gray-100 text-gray-700',
  error: 'bg-yellow-100 text-yellow-700',
  fielders_choice: 'bg-gray-100 text-gray-700',
  double_play: 'bg-red-100 text-red-700',
}

export default function PlayByPlayLog({ plays }: PlayByPlayLogProps) {
  if (plays.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No plays recorded yet
      </div>
    )
  }

  return (
    <div className="divide-y">
      {plays.map((play) => {
        const batterName = play.batter?.full_name || play.opponent_batter?.name || 'Unknown'
        const label = resultLabels[play.result] || play.result
        const colorClass = resultColors[play.result] || 'bg-gray-100 text-gray-700'

        return (
          <div key={play.id} className="px-4 py-3 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-8">
                {play.is_home_team ? 'Bot' : 'Top'} {play.inning}
              </span>
              <span className="font-medium text-gray-900">{batterName}</span>
            </div>
            <div className="flex items-center gap-2">
              {play.rbi > 0 && (
                <span className="text-xs text-gray-500">{play.rbi} RBI</span>
              )}
              <span className={`px-2 py-1 text-xs font-bold rounded ${colorClass}`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

