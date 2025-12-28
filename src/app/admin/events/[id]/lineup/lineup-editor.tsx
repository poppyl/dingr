'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Player {
  id: string
  name: string
  jerseyNumber: number | null
}

interface LineupEntry {
  id: string
  batting_order: number
  fielding_position: string | null
  profile_id?: string
  opponent_player_id?: string
}

interface LineupEditorProps {
  eventId: string
  ourTeamName: string
  opponentTeamName: string
  homeTeamName: string
  awayTeamName: string
  isHomeGame: boolean
  teamPlayers: Player[]
  opponentPlayers: Player[]
  initialOurLineup: LineupEntry[]
  initialOpponentLineup: LineupEntry[]
  opponentTeamId: string
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']

export default function LineupEditor({
  eventId,
  ourTeamName,
  opponentTeamName,
  homeTeamName,
  awayTeamName,
  isHomeGame,
  teamPlayers,
  opponentPlayers: initialOpponentPlayers,
  initialOurLineup,
  initialOpponentLineup,
  opponentTeamId
}: LineupEditorProps) {
  const router = useRouter()
  const supabase = createClient()

  // Initialize lineup state (9 slots)
  const initLineup = (existing: LineupEntry[], useProfileId: boolean) => {
    const lineup: (string | null)[] = Array(9).fill(null)
    const positions: (string | null)[] = Array(9).fill(null)
    
    existing.forEach(entry => {
      const idx = entry.batting_order - 1
      if (idx >= 0 && idx < 9) {
        lineup[idx] = useProfileId ? entry.profile_id || null : entry.opponent_player_id || null
        positions[idx] = entry.fielding_position || null
      }
    })
    
    return { lineup, positions }
  }

  const ourInit = initLineup(initialOurLineup, true)
  const opponentInit = initLineup(initialOpponentLineup, false)

  const [ourLineup, setOurLineup] = useState<(string | null)[]>(ourInit.lineup)
  const [ourPositions, setOurPositions] = useState<(string | null)[]>(ourInit.positions)
  const [opponentLineup] = useState<(string | null)[]>(opponentInit.lineup)
  const [opponentPositions] = useState<(string | null)[]>(opponentInit.positions)
  const [opponentPlayers] = useState<Player[]>(initialOpponentPlayers)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'ours' | 'theirs'>('ours')

  const handlePlayerSelect = (slotIndex: number, playerId: string | null) => {
    const newLineup = [...ourLineup]
    newLineup[slotIndex] = playerId
    setOurLineup(newLineup)
  }

  const handlePositionSelect = (slotIndex: number, position: string | null) => {
    const newPositions = [...ourPositions]
    newPositions[slotIndex] = position
    setOurPositions(newPositions)
  }

  const getAvailablePlayers = (currentSlotIndex: number) => {
    const usedPlayerIds = ourLineup.filter((id, idx) => id && idx !== currentSlotIndex)
    return teamPlayers.filter(p => !usedPlayerIds.includes(p.id))
  }

  const handleSave = async () => {
    setSaving(true)

    // Delete existing lineup for our team
    await supabase.from('game_lineups').delete().eq('event_id', eventId)

    // Insert new lineup for our team
    const ourLineupData = ourLineup
      .map((playerId, idx) => playerId ? {
        event_id: eventId,
        profile_id: playerId,
        batting_order: idx + 1,
        fielding_position: ourPositions[idx]
      } : null)
      .filter(Boolean)

    if (ourLineupData.length > 0) {
      await supabase.from('game_lineups').insert(ourLineupData)
    }

    setSaving(false)
    router.push(`/schedule/${eventId}`)
    router.refresh()
  }

  const renderOurLineupSlots = () => {
    return (
      <div className="space-y-3">
        {Array.from({ length: 9 }, (_, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-sm font-bold text-gray-600">
              {idx + 1}
            </div>
            
            <select
              value={ourLineup[idx] || ''}
              onChange={(e) => handlePlayerSelect(idx, e.target.value || null)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Select player...</option>
              {getAvailablePlayers(idx).map(player => (
                <option key={player.id} value={player.id}>
                  {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
                </option>
              ))}
              {/* Show currently selected player even if they'd normally be filtered */}
              {ourLineup[idx] && !getAvailablePlayers(idx).find(p => p.id === ourLineup[idx]) && (
                <option value={ourLineup[idx]!}>
                  {teamPlayers.find(p => p.id === ourLineup[idx])?.name || 'Unknown'}
                </option>
              )}
            </select>

            <select
              value={ourPositions[idx] || ''}
              onChange={(e) => handlePositionSelect(idx, e.target.value || null)}
              className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Pos</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    )
  }

  const renderOpponentLineupReadOnly = () => {
    const hasAnyLineup = opponentLineup.some(p => p !== null)
    
    if (!hasAnyLineup) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No lineup set yet</p>
          <p className="text-sm mt-1">The opponent&apos;s lineup will appear here once they set it.</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {Array.from({ length: 9 }, (_, idx) => {
          const playerId = opponentLineup[idx]
          const player = playerId ? opponentPlayers.find(p => p.id === playerId) : null
          const position = opponentPositions[idx]

          return (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-sm font-bold text-gray-600">
                {idx + 1}
              </div>
              
              <div className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">
                {player ? (
                  <span>
                    {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>

              <div className="w-20 px-2 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center text-gray-600">
                {position || '—'}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs - Our team vs Their team */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ours')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'ours'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {ourTeamName} (Us)
        </button>
        <button
          onClick={() => setActiveTab('theirs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'theirs'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {opponentTeamName} (Them)
        </button>
      </div>

      {/* Lineup editor */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {activeTab === 'ours' ? 'Our Batting Order' : 'Their Batting Order'}
        </h2>
        
        {activeTab === 'ours' ? (
          renderOurLineupSlots()
        ) : (
          <>
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              View only — you cannot edit the opponent&apos;s lineup
            </div>
            {renderOpponentLineupReadOnly()}
          </>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>{homeTeamName} (Home):</span>
          <span>
            {isHomeGame 
              ? `${ourLineup.filter(Boolean).length}/9 set`
              : `${opponentLineup.filter(Boolean).length}/9 set`
            }
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span>{awayTeamName} (Away):</span>
          <span>
            {isHomeGame 
              ? `${opponentLineup.filter(Boolean).length}/9 set`
              : `${ourLineup.filter(Boolean).length}/9 set`
            }
          </span>
        </div>
      </div>

      {/* Save button - only saves our lineup */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Our Lineup'}
      </button>
    </div>
  )
}