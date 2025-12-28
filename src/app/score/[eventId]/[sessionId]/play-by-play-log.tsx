'use client'

interface Play {
  id: string
  inning: number
  is_home_team: boolean
  result: string
  rbi?: number
  batter?: {
    full_name: string
  } | null
  opponent_batter?: {
    name: string
  } | null
  _demoBatterName?: string  // For demo mode
}

interface PlayByPlayLogProps {
  plays: Play[]
}

// Result display mapping
const RESULT_LABELS: Record<string, { text: string; color: string }> = {
  'single': { text: '1B', color: 'bg-green-100 text-green-700' },
  'double': { text: '2B', color: 'bg-green-100 text-green-700' },
  'triple': { text: '3B', color: 'bg-green-100 text-green-700' },
  'home_run': { text: 'HR', color: 'bg-green-100 text-green-700' },
  'walk': { text: 'BB', color: 'bg-blue-100 text-blue-700' },
  'strikeout_swinging': { text: 'K', color: 'bg-red-100 text-red-700' },
  'strikeout_looking': { text: 'Ⓚ', color: 'bg-red-100 text-red-700' },
  'hit_by_pitch': { text: 'HBP', color: 'bg-blue-100 text-blue-700' },
  'groundout': { text: 'GO', color: 'bg-gray-100 text-gray-700' },
  'flyout': { text: 'FO', color: 'bg-gray-100 text-gray-700' },
  'lineout': { text: 'LO', color: 'bg-gray-100 text-gray-700' },
  'popout': { text: 'PO', color: 'bg-gray-100 text-gray-700' },
  'fielders_choice': { text: 'FC', color: 'bg-gray-100 text-gray-700' },
  'error': { text: 'E', color: 'bg-yellow-100 text-yellow-700' },
  'sacrifice_fly': { text: 'SF', color: 'bg-gray-100 text-gray-700' },
  'sacrifice_bunt': { text: 'SAC', color: 'bg-gray-100 text-gray-700' },
  'double_play': { text: 'DP', color: 'bg-red-100 text-red-700' },
}

const getResultLabel = (result: string) => {
  return RESULT_LABELS[result] || { text: result.toUpperCase(), color: 'bg-gray-100 text-gray-700' }
}

const getResultDescription = (result: string): string => {
  const descriptions: Record<string, string> = {
    'single': 'singled',
    'double': 'doubled',
    'triple': 'tripled',
    'home_run': 'homered',
    'walk': 'walked',
    'strikeout_swinging': 'struck out swinging',
    'strikeout_looking': 'struck out looking',
    'hit_by_pitch': 'hit by pitch',
    'groundout': 'grounded out',
    'flyout': 'flied out',
    'lineout': 'lined out',
    'popout': 'popped out',
    'fielders_choice': 'reached on fielder\'s choice',
    'error': 'reached on error',
    'sacrifice_fly': 'sacrifice fly',
    'sacrifice_bunt': 'sacrifice bunt',
    'double_play': 'grounded into double play',
  }
  return descriptions[result] || result.replace(/_/g, ' ')
}

export default function PlayByPlayLog({ plays }: PlayByPlayLogProps) {
  if (!plays || plays.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No plays recorded yet
      </div>
    )
  }

  const getBatterName = (play: Play): string => {
    // Priority: demo name > profile batter > opponent batter > fallback
    if (play._demoBatterName) {
      return play._demoBatterName
    }
    if (play.batter?.full_name) {
      return play.batter.full_name
    }
    if (play.opponent_batter?.name) {
      return play.opponent_batter.name
    }
    return 'Unknown'
  }

  return (
    <div className="divide-y divide-gray-100">
      {plays.map((play) => {
        const { text, color } = getResultLabel(play.result)
        const batterName = getBatterName(play)
        
        return (
          <div key={play.id} className="px-4 py-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 shrink-0">
                  {play.is_home_team ? 'Bot' : 'Top'} {play.inning}
                </span>
                <span className="font-medium text-gray-900 truncate">
                  {batterName}
                </span>
                <span className="text-gray-500 text-sm truncate">
                  {getResultDescription(play.result)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              {play.rbi && play.rbi > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  {play.rbi} RBI
                </span>
              )}
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${color}`}>
                {text}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}