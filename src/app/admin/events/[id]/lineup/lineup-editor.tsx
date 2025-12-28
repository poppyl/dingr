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
  homeTeamName: string
  awayTeamName: string
  isHomeGame: boolean
  teamPlayers: Player[]
  opponentPlayers: Player[]
  initialHomeLineup: LineupEntry[]
  initialAwayLineup: LineupEntry[]
  opponentTeamId: string
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']

export default function LineupEditor({
  eventId,
  homeTeamName,
  awayTeamName,
  isHomeGame,
  teamPlayers,
  opponentPlayers: initialOpponentPlayers,
  initialHomeLineup,
  initialAwayLineup,
  opponentTeamId
}: LineupEditorProps) {
  const router = useRouter()
  const supabase = createClient()

  // Initialize lineup state (9 slots)
  const initLineup = (existing: LineupEntry[], isOurTeam: boolean) => {
    const lineup: (string | null)[] = Array(9).fill(null)
    const positions: (string | null)[] = Array(9).fill(null)
    
    existing.forEach(entry => {
      const idx = entry.batting_order - 1
      if (idx >= 0 && idx < 9) {
        lineup[idx] = isOurTeam ? entry.profile_id || null : entry.opponent_player_id || null
        positions[idx] = entry.fielding_position || null
      }
    })
    
    return { lineup, positions }
  }

  const ourInit = isHomeGame ? initLineup(initialHomeLineup, true) : initLineup(initialAwayLineup, false)
  const theirInit = isHomeGame ? initLineup(initialAwayLineup, false) : initLineup(initialHomeLineup, true)

  const [ourLineup, setOurLineup] = useState<(string | null)[]>(ourInit.lineup)
  const [ourPositions, setOurPositions] = useState<(string | null)[]>(ourInit.positions)
  const [theirLineup, setTheirLineup] = useState<(string | null)[]>(theirInit.lineup)
  const [theirPositions, setTheirPositions] = useState<(string | null)[]>(theirInit.positions)
  const [opponentPlayers, setOpponentPlayers] = useState<Player[]>(initialOpponentPlayers)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'ours' | 'theirs'>('ours')
  
  // Add player form state
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerNumber, setNewPlayerNumber] = useState('')

  const handlePlayerSelect = (index: number, playerId: string | null, isOurs: boolean) => {
    if (isOurs) {
      const newLineup = [...ourLineup]
      newLineup[index] = playerId
      setOurLineup(newLineup)
    } else {
      const newLineup = [...theirLineup]
      newLineup[index] = playerId
      setTheirLineup(newLineup)
    }
  }

  const handlePositionSelect = (index: number, position: string | null, isOurs: boolean) => {
    if (isOurs) {
      const newPositions = [...ourPositions]
      newPositions[index] = position
      setOurPositions(newPositions)
    } else {
      const newPositions = [...theirPositions]
      newPositions[index] = position
      setTheirPositions(newPositions)
    }
  }

  const getAvailablePlayers = (currentIndex: number, isOurs: boolean) => {
    const lineup = isOurs ? ourLineup : theirLineup
    const players = isOurs ? teamPlayers : opponentPlayers
    const selectedIds = lineup.filter((id, idx) => id && idx !== currentIndex)
    return players.filter(p => !selectedIds.includes(p.id))
  }

  const handleAddOpponentPlayer = async () => {
    if (!newPlayerName.trim()) return

    const { data, error } = await supabase
      .from('opponent_players')
      .insert({
        opponent_team_id: opponentTeamId,
        name: newPlayerName.trim(),
        jersey_number: newPlayerNumber ? parseInt(newPlayerNumber) : null
      })
      .select('id, name, jersey_number')
      .single()

    if (!error && data) {
      setOpponentPlayers([...opponentPlayers, {
        id: data.id,
        name: data.name,
        jerseyNumber: data.jersey_number
      }])
      setNewPlayerName('')
      setNewPlayerNumber('')
      setShowAddPlayer(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    // Delete existing lineups for this event
    await supabase.from('game_lineups').delete().eq('event_id', eventId)
    await supabase.from('opponent_lineups').delete().eq('event_id', eventId)

    // Insert our team's lineup
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

    // Insert opponent's lineup
    const theirLineupData = theirLineup
      .map((playerId, idx) => playerId ? {
        event_id: eventId,
        opponent_player_id: playerId,
        batting_order: idx + 1,
        fielding_position: theirPositions[idx]
      } : null)
      .filter(Boolean)

    if (theirLineupData.length > 0) {
      await supabase.from('opponent_lineups').insert(theirLineupData)
    }

    setSaving(false)
    router.push(`/schedule/${eventId}`)
    router.refresh()
  }

  const renderLineupSlots = (isOurs: boolean) => {
    const lineup = isOurs ? ourLineup : theirLineup
    const positions = isOurs ? ourPositions : theirPositions
    const players = isOurs ? teamPlayers : opponentPlayers

    return (
      <div className="space-y-3">
        {Array.from({ length: 9 }, (_, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-sm font-bold text-gray-600">
              {idx + 1}
            </div>
            
            <select
              value={lineup[idx] || ''}
              onChange={(e) => handlePlayerSelect(idx, e.target.value || null, isOurs)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Select player...</option>
              {getAvailablePlayers(idx, isOurs).map(player => (
                <option key={player.id} value={player.id}>
                  {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
                </option>
              ))}
              {/* Show currently selected player even if they'd normally be filtered */}
              {lineup[idx] && !getAvailablePlayers(idx, isOurs).find(p => p.id === lineup[idx]) && (
                <option value={lineup[idx]!}>
                  {players.find(p => p.id === lineup[idx])?.name || 'Unknown'}
                </option>
              )}
            </select>

            <select
              value={positions[idx] || ''}
              onChange={(e) => handlePositionSelect(idx, e.target.value || null, isOurs)}
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

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ours')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'ours'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {isHomeGame ? homeTeamName : awayTeamName} (Us)
        </button>
        <button
          onClick={() => setActiveTab('theirs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'theirs'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {isHomeGame ? awayTeamName : homeTeamName} (Them)
        </button>
      </div>

      {/* Lineup editor */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {activeTab === 'ours' ? 'Our Batting Order' : 'Their Batting Order'}
        </h2>
        
        {renderLineupSlots(activeTab === 'ours')}

        {/* Add opponent player button */}
        {activeTab === 'theirs' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {showAddPlayer ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Player name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="#"
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddOpponentPlayer}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Add Player
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPlayer(false)
                      setNewPlayerName('')
                      setNewPlayerNumber('')
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddPlayer(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add new opponent player
              </button>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Lineups'}
      </button>
    </div>
  )
}
